import { useMemo } from 'react';
import { Search, X, ListVideo } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { TYPE_META, FILTERS, FILTER_LABELS, timestampToSeconds } from '../lib/eventTypes.js';

export default function InsightsTimeline({ onEventClick }) {
  const summary = useStore((s) => s.summary);
  const events = useStore((s) => s.events);
  const activeFilter = useStore((s) => s.activeFilter);
  const setActiveFilter = useStore((s) => s.setActiveFilter);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events
      .map((e) => ({ ...e, _seconds: timestampToSeconds(e.timestamp) }))
      .filter((e) => (activeFilter === 'all' ? true : e.type === activeFilter))
      .filter((e) => (q ? e.description.toLowerCase().includes(q) : true));
  }, [events, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    const c = { all: events.length };
    for (const f of FILTERS) {
      if (f === 'all') continue;
      c[f] = events.filter((e) => e.type === f).length;
    }
    return c;
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      {summary && (
        <div className="px-4 py-3 border-b border-hairline bg-panel/60">
          <p className="text-[11px] font-mono tracking-[0.12em] text-ink-muted uppercase mb-1">
            Scene summary
          </p>
          <p className="text-[13px] text-ink-primary/90 leading-relaxed">{summary}</p>
        </div>
      )}

      <div className="px-4 pt-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events — 'red car', 'door', 'voice'…"
            className="w-full bg-panel-raised border border-hairline focus:border-signal/50 rounded-md pl-8 pr-8 py-2 text-[13px] text-ink-primary placeholder:text-ink-faint outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-primary"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f;
            const meta = TYPE_META[f];
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors
                  ${
                    isActive
                      ? 'bg-ink-primary/10 border-ink-primary/30 text-ink-primary'
                      : 'border-hairline text-ink-muted hover:border-ink-faint'
                  }`}
              >
                {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
                {FILTER_LABELS[f]}
                <span className="text-ink-faint">{counts[f] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-2 px-2 pb-4">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-16 text-ink-faint">
            <ListVideo size={28} />
            <p className="text-[13px] text-ink-muted">No events match this filter.</p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {filteredEvents.map((evt) => {
              const meta = TYPE_META[evt.type] ?? TYPE_META.activity;
              const Icon = meta.icon;
              return (
                <li key={evt.id}>
                  <button
                    onClick={() => onEventClick(evt._seconds)}
                    className={`w-full text-left flex gap-3 px-2.5 py-2.5 rounded-lg border border-transparent hover:bg-panel-raised hover:border-hairline transition-colors group`}
                  >
                    <div className="flex flex-col items-center pt-0.5">
                      <div
                        className={`w-6 h-6 rounded-full border ${meta.border} flex items-center justify-center ${meta.text} bg-panel`}
                      >
                        <Icon size={12} />
                      </div>
                      <div className="w-px flex-1 bg-hairline mt-1 group-last:hidden" />
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-signal tabular group-hover:underline">
                          {evt.timestamp}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wide ${meta.text}`}>
                          {meta.label}
                        </span>
                        <span className="ml-auto text-[10px] font-mono text-ink-faint tabular">
                          {evt.confidence}%
                        </span>
                      </div>
                      <p className="text-[13px] text-ink-primary/90 mt-0.5 leading-snug">
                        {evt.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
