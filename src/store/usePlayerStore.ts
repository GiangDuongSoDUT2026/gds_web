import { create } from "zustand";

interface PlayerState {
  currentLectureId: string | null;
  currentTimestamp: number;
  isPlaying: boolean;
  seekTarget: number | null;
  setCurrentLectureId: (id: string | null) => void;
  setCurrentTimestamp: (timestamp: number) => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (timestamp: number) => void;
  clearSeekTarget: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentLectureId: null,
  currentTimestamp: 0,
  isPlaying: false,
  seekTarget: null,

  setCurrentLectureId: (id) => set({ currentLectureId: id }),

  setCurrentTimestamp: (timestamp) =>
    set({ currentTimestamp: timestamp }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  seekTo: (timestamp) =>
    set({ seekTarget: timestamp, isPlaying: true }),

  clearSeekTarget: () => set({ seekTarget: null }),
}));
