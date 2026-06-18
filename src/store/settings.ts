import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme         = "dark" | "amoled" | "midnight";
export type CardStyle     = "netflix" | "plex" | "compact";
export type TrendingSource = "tmdb" | "anilist" | "combined";

export interface SettingsState {
  // Appearance
  theme:           Theme;
  cardStyle:       CardStyle;
  animationsEnabled: boolean;
  backdropBlur:    boolean;

  // Playback
  defaultVolume:      number;
  autoPlayNext:       boolean;
  autoSkipIntro:      boolean;
  autoSkipOutro:      boolean;
  rememberSpeed:      boolean;
  defaultSubtitleLang: string;
  defaultAudioLang:   string;

  // Discovery
  trendingSource:    TrendingSource;
  showAnime:         boolean;
  showKDrama:        boolean;
  showMovies:        boolean;
  hideNSFWAnime:     boolean;

  // Actions
  setTheme:            (v: Theme) => void;
  setCardStyle:        (v: CardStyle) => void;
  setAnimationsEnabled:(v: boolean) => void;
  setBackdropBlur:     (v: boolean) => void;
  setDefaultVolume:    (v: number) => void;
  setAutoPlayNext:     (v: boolean) => void;
  setAutoSkipIntro:    (v: boolean) => void;
  setAutoSkipOutro:    (v: boolean) => void;
  setRememberSpeed:    (v: boolean) => void;
  setDefaultSubtitleLang:(v: string) => void;
  setDefaultAudioLang: (v: string) => void;
  setTrendingSource:   (v: TrendingSource) => void;
  setShowAnime:        (v: boolean) => void;
  setShowKDrama:       (v: boolean) => void;
  setShowMovies:       (v: boolean) => void;
  setHideNSFWAnime:    (v: boolean) => void;
  resetAll:            () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  theme:              "dark" as Theme,
  cardStyle:          "netflix" as CardStyle,
  animationsEnabled:  true,
  backdropBlur:       true,
  defaultVolume:      100,
  autoPlayNext:       true,
  autoSkipIntro:      false,
  autoSkipOutro:      false,
  rememberSpeed:      true,
  defaultSubtitleLang: "off",
  defaultAudioLang:   "original",
  trendingSource:     "combined" as TrendingSource,
  showAnime:          true,
  showKDrama:         true,
  showMovies:         true,
  hideNSFWAnime:      true,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setTheme:             (v) => set({ theme: v }),
      setCardStyle:         (v) => set({ cardStyle: v }),
      setAnimationsEnabled: (v) => set({ animationsEnabled: v }),
      setBackdropBlur:      (v) => set({ backdropBlur: v }),
      setDefaultVolume:     (v) => set({ defaultVolume: v }),
      setAutoPlayNext:      (v) => set({ autoPlayNext: v }),
      setAutoSkipIntro:     (v) => set({ autoSkipIntro: v }),
      setAutoSkipOutro:     (v) => set({ autoSkipOutro: v }),
      setRememberSpeed:     (v) => set({ rememberSpeed: v }),
      setDefaultSubtitleLang:(v)=> set({ defaultSubtitleLang: v }),
      setDefaultAudioLang:  (v) => set({ defaultAudioLang: v }),
      setTrendingSource:    (v) => set({ trendingSource: v }),
      setShowAnime:         (v) => set({ showAnime: v }),
      setShowKDrama:        (v) => set({ showKDrama: v }),
      setShowMovies:        (v) => set({ showMovies: v }),
      setHideNSFWAnime:     (v) => set({ hideNSFWAnime: v }),
      resetAll:             () => set(DEFAULTS),
    }),
    { name: "parallaxtv-settings" }
  )
);