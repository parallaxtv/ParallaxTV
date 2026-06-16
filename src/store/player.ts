import { create } from "zustand";

interface CurrentMedia {
  id: string;
  title: string;
  type?: string;
  poster?: string;
}

interface PlayerStore {
  // Playback state
  isPlaying: boolean;

  isPaused: boolean;

  isFullscreen: boolean;

  volume: number;

  currentTime: number;

  duration: number;

  currentMedia: CurrentMedia | null;

  // Actions
  setPlaying: (playing: boolean) => void;

  setPaused: (paused: boolean) => void;

  setFullscreen: (fullscreen: boolean) => void;

  setVolume: (volume: number) => void;

  setCurrentTime: (time: number) => void;

  setDuration: (duration: number) => void;

  setCurrentMedia: (media: CurrentMedia | null) => void;

  resetPlayer: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  // Initial state
  isPlaying: false,

  isPaused: false,

  isFullscreen: false,

  volume: 100,

  currentTime: 0,

  duration: 0,

  currentMedia: null,

  // Actions
  setPlaying: (playing) =>
    set({
      isPlaying: playing,
    }),

  setPaused: (paused) =>
    set({
      isPaused: paused,
    }),

  setFullscreen: (fullscreen) =>
    set({
      isFullscreen: fullscreen,
    }),

  setVolume: (volume) =>
    set({
      volume,
    }),

  setCurrentTime: (time) =>
    set({
      currentTime: time,
    }),

  setDuration: (duration) =>
    set({
      duration,
    }),

  setCurrentMedia: (media) =>
    set({
      currentMedia: media,
    }),

  resetPlayer: () =>
    set({
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      currentMedia: null,
    }),
}));