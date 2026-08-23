import { useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { resolveMediaUrl } from '../lib/api.js';
import VideoPlayer from './VideoPlayer.jsx';
import InsightsTimeline from './InsightsTimeline.jsx';

export default function DashboardLayout() {
  const videoUrl = useStore((s) => s.videoUrl);
  const events = useStore((s) => s.events);
  const playerRef = useRef(null);

  const handleEventClick = (seconds) => {
    playerRef.current?.seekTo(seconds);
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 p-4 max-w-[1600px] mx-auto w-full">
      <section className="flex flex-col min-h-[380px]">
        <VideoPlayer
          ref={playerRef}
          src={resolveMediaUrl(videoUrl)}
          events={events}
          cameraLabel="UPLOADED FEED"
        />
      </section>

      <section className="flex flex-col rounded-lg border border-hairline bg-panel overflow-hidden lg:max-h-[calc(100vh-96px)]">
        <InsightsTimeline onEventClick={handleEventClick} />
      </section>
    </div>
  );
}
