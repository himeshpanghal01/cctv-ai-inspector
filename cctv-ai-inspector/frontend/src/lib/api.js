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

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        reject(new Error(payload.error || 'Analysis failed. Please try again.'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error — is the backend running?'));

    xhr.send(formData);
  });
}

export function resolveMediaUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}
