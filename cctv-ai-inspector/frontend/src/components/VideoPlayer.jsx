import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Circle } from 'lucide-react';
import { TYPE_META, secondsToTimestamp, timestampToSeconds } from '../lib/eventTypes.js';

const VideoPlayer = forwardRef(function VideoPlayer({ src, events, cameraLabel }, ref) {
  const videoEl = useRef(null);
  const containerEl = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverPct, setHoverPct] = useState(null);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      if (!videoEl.current) return;
      videoEl.current.currentTime = seconds;
      videoEl.current.play().catch(() => {});
      setIsPlaying(true);
    },
  }));

  useEffect(() => {
    const el = videoEl.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(el.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [src]);

  const togglePlay = () => {
    const el = videoEl.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const toggleMute = () => {
    const el = videoEl.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const toggleFullscreen = () => {
    containerEl.current?.requestFullscreen?.().catch(() => {});
  };

  const pctFromClientX = (clientX, trackEl) => {
    const rect = trackEl.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return pct;
  };

  const handleScrubMove = (e) => {
    const pct = pctFromClientX(e.clientX, e.currentTarget);
    setHoverPct(pct);
    if (isScrubbing && videoEl.current && duration) {
      videoEl.current.currentTime = pct * duration;
    }
  };

  const handleScrubDown = (e) => {
    setIsScrubbing(true);
    handleScrubMove(e);
  };

  useEffect(() => {
    const onUp = () => setIsScrubbing(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerEl}
        className="relative flex-1 bg-black rounded-lg overflow-hidden border border-hairline group"
      >
        <video
          ref={videoEl}
          src={src}
          className="w-full h-full object-contain bg-black"
          onClick={togglePlay}
        />

        {/* Camera OSD overlay — mimics a real CCTV burn-in overlay */}
        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 font-mono text-[11px] text-signal/90 drop-shadow">
          <Circle className="fill-alert text-alert animate-blink" size={8} />
          REC
          <span className="text-ink-primary/80 ml-1.5">{cameraLabel}</span>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[12px] tabular text-ink-primary/90 drop-shadow bg-black/30 rounded px-1.5 py-0.5">
          {secondsToTimestamp(currentTime)} / {secondsToTimestamp(duration)}
        </div>

        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-14 h-14 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur">
              <Play className="text-white ml-0.5" size={22} />
            </div>
          </button>
        )}
      </div>

      {/* Signature element: NVR-style event scrub strip */}
      <div className="mt-3 px-0.5">
        <div
          className="relative h-8 flex items-center cursor-pointer"
          onMouseDown={handleScrubDown}
          onMouseMove={handleScrubMove}
          onMouseLeave={() => setHoverPct(null)}
        >
          <div className="relative w-full h-1.5 rounded-full bg-panel-raised overflow-visible">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-signal/70"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-signal shadow-panel"
              style={{ left: `calc(${progressPct}% - 6px)` }}
            />
            {duration > 0 &&
              events.map((evt) => {
                const t = timestampToSeconds(evt.timestamp);
                const pct = Math.min(100, (t / duration) * 100);
                const meta = TYPE_META[evt.type] ?? TYPE_META.activity;
                return (
                  <div
                    key={evt.id}
                    title={`${evt.timestamp} · ${meta.label}`}
                    className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-3.5 rounded-sm ${meta.dot} opacity-80`}
                    style={{ left: `${pct}%` }}
                  />
                );
              })}
          </div>
          {hoverPct !== null && duration > 0 && (
            <div
              className="absolute -top-6 -translate-x-1/2 font-mono text-[10px] text-ink-muted bg-panel border border-hairline rounded px-1.5 py-0.5 pointer-events-none"
              style={{ left: `${hoverPct * 100}%` }}
            >
              {secondsToTimestamp(hoverPct * duration)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-md border border-hairline hover:border-ink-faint flex items-center justify-center text-ink-primary transition-colors"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-md border border-hairline hover:border-ink-faint flex items-center justify-center text-ink-muted transition-colors"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <span className="font-mono text-[11px] text-ink-muted tabular ml-1">
              {secondsToTimestamp(currentTime)} / {secondsToTimestamp(duration)}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-md border border-hairline hover:border-ink-faint flex items-center justify-center text-ink-muted transition-colors"
          >
            <Maximize size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
