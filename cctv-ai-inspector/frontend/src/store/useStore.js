import { create } from 'zustand';

export const STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  ANALYZING: 'analyzing',
  READY: 'ready',
  ERROR: 'error',
};

export const useStore = create((set) => ({
  status: STATUS.IDLE,
  error: null,

  fileName: null,
  videoUrl: null,
  summary: '',
  events: [],

  activeFilter: 'all',
  searchQuery: '',
  seekToSeconds: null, // set by the timeline, consumed by the video player

  reset: () =>
    set({
      status: STATUS.IDLE,
      error: null,
      fileName: null,
      videoUrl: null,
      summary: '',
      events: [],
      activeFilter: 'all',
      searchQuery: '',
      seekToSeconds: null,
    }),

  setStatus: (status) => set({ status }),
  setError: (error) => set({ status: STATUS.ERROR, error }),

  setAnalysis: ({ fileName, videoUrl, summary, events }) =>
    set({
      status: STATUS.READY,
      fileName,
      videoUrl,
      summary,
      events,
      error: null,
    }),

  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  requestSeek: (seconds) => set({ seekToSeconds: seconds }),
  clearSeekRequest: () => set({ seekToSeconds: null }),
}));
