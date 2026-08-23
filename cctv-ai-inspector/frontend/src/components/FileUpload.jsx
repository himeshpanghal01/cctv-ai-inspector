import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileVideo, AlertTriangle } from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv'];
const ACCEPTED_MIME_PREFIX = 'video/';
const MAX_SIZE_MB = 500;

export default function FileUpload({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  const validate = useCallback((file) => {
    if (!file) return 'No file selected.';
    const isVideo = file.type.startsWith(ACCEPTED_MIME_PREFIX);
    const hasKnownExt = ACCEPTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!isVideo && !hasKnownExt) {
      return `Unsupported file. Use ${ACCEPTED_EXTENSIONS.join(', ')}.`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File exceeds the ${MAX_SIZE_MB}MB limit.`;
    }
    return null;
  }, []);

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0];
      const validationError = validate(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      setLocalError(null);
      onFileSelected(file);
    },
    [onFileSelected, validate]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="w-full max-w-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all
          ${
            isDragging
              ? 'border-signal bg-signal/[0.06] scale-[1.01]'
              : 'border-hairline hover:border-ink-faint bg-panel/40'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center border transition-colors
              ${isDragging ? 'border-signal text-signal bg-signal/10' : 'border-hairline text-ink-muted'}`}
          >
            {isDragging ? <FileVideo size={24} /> : <UploadCloud size={24} />}
          </div>

          <div>
            <p className="text-ink-primary font-medium text-[15px]">
              Drop CCTV footage here, or click to browse
            </p>
            <p className="text-ink-muted text-[12px] mt-1 font-mono">
              MP4 · WEBM · MOV · MKV — up to {MAX_SIZE_MB}MB
            </p>
          </div>
        </div>
      </div>

      {localError && (
        <div className="mt-3 flex items-center gap-2 text-alert text-[12px] font-mono">
          <AlertTriangle size={14} />
          {localError}
        </div>
      )}
    </div>
  );
}
