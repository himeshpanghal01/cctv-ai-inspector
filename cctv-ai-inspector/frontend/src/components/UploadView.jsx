import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, AlertTriangle, RotateCcw } from 'lucide-react';
import { useStore, STATUS } from '../store/useStore.js';
import { analyzeVideo } from '../lib/api.js';
import FileUpload from './FileUpload.jsx';

const SCAN_STAGES = [
  'Reading frame buffer…',
  'Isolating motion regions…',
  'Detecting people & objects…',
  'Running OCR on overlays…',
  'Transcribing audio track…',
  'Flagging anomalies…',
];

export default function UploadView() {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const setStatus = useStore((s) => s.setStatus);
  const setError = useStore((s) => s.setError);
  const setAnalysis = useStore((s) => s.setAnalysis);
  const reset = useStore((s) => s.reset);

  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  const isBusy = status === STATUS.UPLOADING || status === STATUS.ANALYZING;

  useEffect(() => {
    if (status !== STATUS.ANALYZING) return;
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % SCAN_STAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [status]);

  const handleFile = async (file) => {
    setProgress(0);
    setStageIndex(0);
    setStatus(STATUS.UPLOADING);
    try {
      const result = await analyzeVideo(file, (pct) => {
        setProgress(pct);
        if (pct >= 100) setStatus(STATUS.ANALYZING);
      });
      setAnalysis(result);
    } catch (err) {
      setError(err.message || 'Something went wrong analyzing this footage.');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <AnimatePresence mode="wait">
        {status === STATUS.ERROR ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md text-center"
          >
            <div className="w-14 h-14 mx-auto rounded-full border border-alert/40 bg-alert/10 flex items-center justify-center mb-4">
              <AlertTriangle className="text-alert" size={24} />
            </div>
            <h2 className="text-ink-primary font-semibold text-lg mb-1">Analysis failed</h2>
            <p className="text-ink-muted text-sm mb-6">{error}</p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 text-[13px] border border-hairline hover:border-ink-faint rounded-md px-4 py-2 text-ink-primary transition-colors"
            >
              <RotateCcw size={14} />
              Try another file
            </button>
          </motion.div>
        ) : isBusy ? (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl"
          >
            <div className="relative aspect-video rounded-xl border border-hairline bg-panel overflow-hidden">
              <motion.div
                className="absolute left-0 right-0 h-24 bg-gradient-to-b from-signal/0 via-signal/10 to-signal/0"
                animate={{ y: ['-10%', '110%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <ScanLine className="text-signal" size={32} />
                <div className="text-center">
                  <p className="font-mono text-[12px] tracking-[0.15em] text-signal uppercase">
                    {status === STATUS.UPLOADING ? 'Transmitting footage' : 'AI analysis in progress'}
                  </p>
                  <p className="text-ink-muted text-[12px] mt-1 h-4">
                    {status === STATUS.UPLOADING
                      ? `${progress}% uploaded`
                      : SCAN_STAGES[stageIndex]}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-panel-raised">
                <motion.div
                  className="h-full bg-signal"
                  initial={{ width: '0%' }}
                  animate={{
                    width: status === STATUS.UPLOADING ? `${progress}%` : '100%',
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            <p className="text-center text-ink-faint text-[11px] font-mono mt-4">
              Longer clips take longer — Gemini is watching every frame.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            <div className="text-center mb-8 max-w-lg">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-[0.15em] text-signal uppercase border border-signal/30 bg-signal/5 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-signal" />
                System online
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-ink-primary tracking-tight">
                Point it at the footage.
                <br />
                <span className="text-ink-muted">It reads every frame.</span>
              </h1>
              <p className="text-ink-muted text-sm mt-4">
                Upload a clip and Sentry transcribes audio, reads on-screen text and
                plates, tags every person and object, and flags what looks wrong —
                each finding jumps straight to its moment in the tape.
              </p>
            </div>
            <FileUpload onFileSelected={handleFile} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
