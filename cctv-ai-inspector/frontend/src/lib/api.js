const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? 'https://cctv-ai-inspector.onrender.com' : '');

/**
 * Uploads a video file for AI analysis and returns the parsed insights payload.
 * @param {File} file
 * @param {(pct: number) => void} onProgress
 */
export function analyzeVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/analyze`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload = {};
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error('Received an invalid response from the server.'));
      }

      if (xhr.status === 202 && payload.jobId) {
        pollAnalysis(payload.jobId, resolve, reject);
      } else if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        reject(new Error(payload.error || 'Analysis failed. Please try again.'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error — is the backend running?'));

    xhr.send(formData);
  });
}

async function pollAnalysis(jobId, resolve, reject) {
  const startedAt = Date.now();
  const poll = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analyze/${jobId}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Analysis job was not found.');
      if (payload.status === 'completed') return resolve(payload);
      if (payload.status === 'failed') return reject(new Error(payload.error));
      if (Date.now() - startedAt > 15 * 60 * 1000) {
        return reject(new Error('Analysis is taking too long. Try a shorter video.'));
      }
      window.setTimeout(poll, 2000);
    } catch (error) {
      reject(error);
    }
  };
  poll();
}

export function resolveMediaUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}
