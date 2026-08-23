import { ShieldHalf, RotateCcw } from 'lucide-react';
import { useStore, STATUS } from './store/useStore.js';
import UploadView from './components/UploadView.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';

function useClock() {
  // Lightweight live clock for the header — grounds the "system online" feel
  // without pulling in a date library.
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

export default function App() {
  const status = useStore((s) => s.status);
  const fileName = useStore((s) => s.fileName);
  const reset = useStore((s) => s.reset);
  const clock = useClock();

  const isDashboard = status === STATUS.READY;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-hairline bg-panel/60 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-signal/10 border border-signal/30 flex items-center justify-center">
              <ShieldHalf className="w-4.5 h-4.5 text-signal" size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-mono text-[13px] tracking-[0.2em] text-ink-primary font-semibold">
                SENTRY
              </div>
              <div className="text-[10px] tracking-[0.15em] text-ink-muted uppercase">
                AI Footage Inspector
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isDashboard && fileName && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-ink-muted border border-hairline rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-blink" />
                <span className="truncate max-w-[220px]">{fileName}</span>
              </div>
            )}

            <div className="hidden md:block text-[11px] font-mono text-ink-muted tabular">
              {clock} LOCAL
            </div>

            {isDashboard && (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink-primary border border-hairline hover:border-ink-faint rounded-md px-2.5 py-1.5 transition-colors"
              >
                <RotateCcw size={13} />
                New scan
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {isDashboard ? <DashboardLayout /> : <UploadView />}
      </main>
    </div>
  );
}
