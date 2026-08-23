import { Activity, Box, AlertOctagon, ScanText, AudioLines } from 'lucide-react';

export const TYPE_META = {
  activity: {
    label: 'Activity',
    icon: Activity,
    dot: 'bg-ink-muted',
    text: 'text-ink-muted',
    border: 'border-ink-faint',
    ring: 'ring-ink-faint/30',
  },
  object: {
    label: 'Object',
    icon: Box,
    dot: 'bg-signal',
    text: 'text-signal',
    border: 'border-signal/40',
    ring: 'ring-signal/30',
  },
  suspicious: {
    label: 'Suspicious',
    icon: AlertOctagon,
    dot: 'bg-alert',
    text: 'text-alert',
    border: 'border-alert/40',
    ring: 'ring-alert/30',
  },
  ocr: {
    label: 'Text / OCR',
    icon: ScanText,
    dot: 'bg-amber',
    text: 'text-amber',
    border: 'border-amber/40',
    ring: 'ring-amber/30',
  },
  audio: {
    label: 'Audio',
    icon: AudioLines,
    dot: 'bg-audio',
    text: 'text-audio',
    border: 'border-audio/40',
    ring: 'ring-audio/30',
  },
};

export const FILTERS = ['all', 'suspicious', 'object', 'ocr', 'audio'];

export const FILTER_LABELS = {
  all: 'All',
  suspicious: 'Suspicious',
  object: 'Object',
  ocr: 'Text',
  audio: 'Audio',
};

export function timestampToSeconds(ts) {
  const match = /^(\d+):(\d{1,2})$/.exec(String(ts).trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function secondsToTimestamp(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
