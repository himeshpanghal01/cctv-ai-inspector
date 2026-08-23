# Sentry — AI CCTV Video Inspector

A full-stack app that ingests CCTV footage, sends it to Gemini 1.5 Pro for
frame-by-frame analysis (activity, objects, on-screen text/OCR, spoken audio,
and anomalies), and displays the findings on a timestamped timeline that's
synced to a custom video player — click any event and the player jumps
straight to that moment.

## Stack

- **Frontend:** React 18 + Vite, Tailwind CSS, Framer Motion, Lucide icons, Zustand
- **Backend:** Node.js + Express, Multer
- **AI:** Google Gemini 1.5 Pro via `@google/generative-ai` (File API + JSON mode)

## 1. Get a Gemini API key

Grab a free key at **https://aistudio.google.com/app/apikey**.

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# open .env and paste your key into GEMINI_API_KEY=
npm run dev
```

The API starts on **http://localhost:8787**. `GET /api/health` confirms it's
running and whether a key is configured.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` and
`/uploads` to the backend, so no extra config is needed.

## 4. Use it

1. Drop an MP4/WebM/MOV/MKV file (up to 500MB) onto the upload zone.
2. The file uploads to the backend, which hands it to Gemini's File API,
   waits for processing, and requests a structured JSON analysis.
3. You land on the dashboard: video on the left, a searchable/filterable
   event timeline on the right. Click any event to seek the video to that
   timestamp; the ticks on the scrub bar under the video mark every
   detected event by type.

## How the analysis works

`backend/server.js`:

1. `multer` saves the upload to `backend/uploads/`.
2. `GoogleAIFileManager.uploadFile()` sends it to Gemini's File API and the
   server polls `getFile()` until the state is `ACTIVE` (or fails/times out).
3. `gemini-3.6-flash` is called with `responseMimeType: "application/json"`
   and a prompt that asks for a summary plus a chronological `events[]`
   array (`activity | object | suspicious | ocr | audio`, each with a
   timestamp, description, and confidence score).
4. The response is parsed, validated, and normalized (bad/missing fields
   are defaulted, events are sorted by timestamp) before it's returned to
   the client alongside a playable URL for the original upload.

## Notes

- Analysis time scales with clip length — Gemini has to watch the whole
  video before it can respond, so a 5-minute clip will take noticeably
  longer than a 30-second one.
- `MAX_UPLOAD_MB` (default 500) and `PORT` are configurable in
  `backend/.env`.
- Uploaded files stay in `backend/uploads/` for playback; the copy sent to
  Gemini's File API is deleted after analysis completes.
