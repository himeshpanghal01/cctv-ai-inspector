import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8787;
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 500);
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!GEMINI_API_KEY) {
  console.warn(
    '[WARN] GEMINI_API_KEY is not set. Add it to backend/.env before analyzing footage.'
  );
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const fileManager = GEMINI_API_KEY ? new GoogleAIFileManager(GEMINI_API_KEY) : null;
const analysisJobs = new Map();

// ---------------------------------------------------------------------------
// Express app setup
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

const MIME_TYPES_BY_EXTENSION = new Map([
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.mov', 'video/quicktime'],
  ['.mkv', 'video/x-matroska'],
]);

function getSupportedMimeType(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (MIME_TYPES_BY_EXTENSION.has(extension)) {
    return MIME_TYPES_BY_EXTENSION.get(extension);
  }
  if (file.mimetype?.startsWith('video/')) {
    return file.mimetype;
  }
  // Some Android browsers send a selected video as a generic binary blob.
  return file.mimetype === 'application/octet-stream' ? 'video/mp4' : null;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase() || '.mp4';
    const stamp = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `cctv-${stamp}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!getSupportedMimeType(file)) {
      return cb(new Error('UNSUPPORTED_FORMAT'));
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Gemini analysis pipeline
// ---------------------------------------------------------------------------
const ANALYSIS_PROMPT = `You are a security and surveillance AI. Analyze the provided CCTV footage. Return a JSON object with the following structure:
{
  "summary": "Brief overview of the video",
  "events": [
    {
      "timestamp": "MM:SS",
      "type": "activity | object | suspicious | ocr | audio",
      "description": "Detailed description of what is happening, seen, or heard",
      "confidence": 1-100
    }
  ]
}
Extract all spoken audio as text, identify on-screen text (OCR) like license plates or signs, list all detected people/objects, and flag any anomalous or suspicious activity. Order events chronologically by timestamp. Return ONLY the JSON object, no markdown fences, no commentary.`;

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes ceiling for Gemini to process the upload

async function waitForFileActive(fileName) {
  const startedAt = Date.now();
  let file = await fileManager.getFile(fileName);

  while (file.state === FileState.PROCESSING) {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new Error('GEMINI_PROCESSING_TIMEOUT');
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    file = await fileManager.getFile(fileName);
  }

  if (file.state === FileState.FAILED) {
    throw new Error('GEMINI_FILE_PROCESSING_FAILED');
  }

  return file;
}

function extractJson(rawText) {
  // Gemini is instructed to return raw JSON, but strip markdown fences defensively.
  const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

function normalizeAnalysis(parsed) {
  const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
  const events = Array.isArray(parsed.events) ? parsed.events : [];

  const VALID_TYPES = new Set(['activity', 'object', 'suspicious', 'ocr', 'audio']);
  const toSeconds = (ts) => {
    const match = /^(\d+):(\d{1,2})$/.exec(String(ts).trim());
    if (!match) return Number.MAX_SAFE_INTEGER;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const normalizedEvents = events
    .filter((e) => e && typeof e.description === 'string')
    .map((e, idx) => ({
      id: `evt-${idx}-${Date.now()}`,
      timestamp: typeof e.timestamp === 'string' ? e.timestamp : '00:00',
      type: VALID_TYPES.has(e.type) ? e.type : 'activity',
      description: e.description,
      confidence: Number.isFinite(Number(e.confidence))
        ? Math.max(1, Math.min(100, Math.round(Number(e.confidence))))
        : 50,
    }))
    .sort((a, b) => toSeconds(a.timestamp) - toSeconds(b.timestamp));

  return { summary, events: normalizedEvents };
}

async function analyzeVideoWithGemini(localFilePath, mimeType) {
  const uploadResult = await fileManager.uploadFile(localFilePath, {
    mimeType,
    displayName: path.basename(localFilePath),
  });

  const activeFile = await waitForFileActive(uploadResult.file.name);

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const result = await model.generateContent([
    {
      fileData: {
        fileUri: activeFile.uri,
        mimeType: activeFile.mimeType,
      },
    },
    { text: ANALYSIS_PROMPT },
  ]);

  const rawText = result.response.text();
  const parsed = extractJson(rawText);

  // Best-effort cleanup of the remote copy — analysis is already complete.
  fileManager.deleteFile(activeFile.name).catch(() => {});

  return normalizeAnalysis(parsed);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, geminiConfigured: Boolean(GEMINI_API_KEY) });
});

app.get('/api/analyze/:jobId', (req, res) => {
  const job = analysisJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Analysis job was not found.' });
  return res.json(job);
});

app.post('/api/analyze', (req, res) => {
  upload.single('video')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const message =
        uploadErr.message === 'UNSUPPORTED_FORMAT'
          ? 'Unsupported video format. Please upload MP4, WebM, MOV, or MKV.'
          : uploadErr.code === 'LIMIT_FILE_SIZE'
          ? `File too large. Max size is ${MAX_UPLOAD_MB}MB.`
          : 'Upload failed. Please try again.';
      return res.status(400).json({ error: message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file was provided.' });
    }

    if (!genAI || !fileManager) {
      return res.status(500).json({
        error: 'Server is missing GEMINI_API_KEY. Add it to backend/.env and restart.',
      });
    }

    const localPath = req.file.path;
    const videoUrl = `/uploads/${req.file.filename}`;
    const jobId = `job-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    analysisJobs.set(jobId, {
      status: 'processing',
      fileName: req.file.originalname,
      videoUrl,
    });

    // Return before Gemini processing starts so Render does not time out long jobs.
    res.status(202).json({ jobId, status: 'processing' });

    (async () => {
      try {
      const mimeType = getSupportedMimeType(req.file);
      const analysis = await analyzeVideoWithGemini(localPath, mimeType);
      analysisJobs.set(jobId, {
        status: 'completed',
        videoUrl,
        fileName: req.file.originalname,
        ...analysis,
      });
      } catch (err) {
        console.error('[ANALYZE_ERROR]', err);
        const errorStatus = Number(err.status || err.statusCode);
        const message =
        err.message === 'GEMINI_PROCESSING_TIMEOUT'
          ? 'Gemini took too long to process this video. Try a shorter clip.'
          : err.message === 'GEMINI_FILE_PROCESSING_FAILED'
          ? 'Gemini could not process this video. On Android, export it as MP4 (H.264) and try again.'
          : errorStatus === 401 || errorStatus === 403
          ? 'The Gemini API key was rejected. Check the key in Render environment variables.'
          : errorStatus === 429
          ? 'Gemini is temporarily rate-limited. Wait a minute and try again.'
          : errorStatus === 404
          ? 'The configured Gemini model is unavailable. Check the backend model configuration.'
          : err instanceof SyntaxError
          ? 'The AI response could not be parsed. Please try again.'
          : 'Analysis failed. Please try again.';
        analysisJobs.set(jobId, { status: 'failed', error: message });
      }
    })();
  });
});

app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED_ERROR]', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`CCTV AI Inspector backend listening on http://localhost:${PORT}`);
});
