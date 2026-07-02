import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme          = "dark" | "amoled" | "midnight";
export type AccentTheme    = "aurora" | "ocean" | "emerald" | "sunset" | "crimson" | (string & {});
export type CardStyle     = "netflix" | "plex" | "compact";
export type TrendingSource = "tmdb" | "anilist" | "combined";
export type HeroContentType = "movies" | "shows" | "anime";
export type HeroTimeRange = "all" | "month" | "6months" | "year";

export interface SettingsState {
  // Appearance
  theme:             Theme;
  accentTheme:       AccentTheme;
  cardStyle:         CardStyle;
  animationsEnabled: boolean;
  backdropBlur:      boolean;

  // Playback
  defaultVolume:       number;
  autoPlayNext:        boolean;
  autoSkipIntro:       boolean;
  autoSkipOutro:       boolean;
  rememberSpeed:       boolean;
  defaultSubtitleLang: string;
  defaultAudioLang:    string;

  // Discovery
  trendingSource:    TrendingSource;
  showAnime:         boolean;
  showKDrama:        boolean;
  showMovies:        boolean;
  hideNSFWAnime:     boolean;

  // Hero Banner
  heroMinRating:        number;            // 0 = no minimum
  heroContentTypes:     HeroContentType[]; // which content types are eligible
  heroLibraryIds:       string[];          // specific library IDs to include as fallbacks
  heroUseFallbackLibraries: boolean;        // use only selected fallback libraries instead of auto content types
  heroOnlyTrending:     boolean;           // restrict to high-rated "trending" pool only
  heroTimeRange:        HeroTimeRange;     // only include titles released within this window

  // Actions
  setTheme:            (v: Theme) => void;
  setAccentTheme:      (v: AccentTheme) => void;
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
  setHeroMinRating:    (v: number) => void;
  setHeroContentTypes: (v: HeroContentType[]) => void;
  setHeroLibraryIds:   (v: string[]) => void;
  setHeroUseFallbackLibraries: (v: boolean) => void;
  setHeroOnlyTrending: (v: boolean) => void;
  setHeroTimeRange:    (v: HeroTimeRange) => void;
  resetAll:            () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  theme:              "dark" as Theme,
  accentTheme:        "ocean" as AccentTheme,
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
  heroMinRating:      0,
  heroContentTypes:   ["movies", "shows", "anime"] as HeroContentType[],
  heroLibraryIds:     [] as string[], // default empty
  heroUseFallbackLibraries: false,
  heroOnlyTrending:   false,
  heroTimeRange:      "year" as HeroTimeRange,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setTheme:             (v) => set({ theme: v }),
      setAccentTheme:       (v) => set({ accentTheme: v }),
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
      setHeroMinRating:     (v) => set({ heroMinRating: v }),
      setHeroContentTypes:  (v) => set({ heroContentTypes: v }),
      setHeroLibraryIds:    (v) => set({ heroLibraryIds: v }),
      setHeroUseFallbackLibraries: (v) => set({ heroUseFallbackLibraries: v }),
      setHeroOnlyTrending:  (v) => set({ heroOnlyTrending: v }),
      setHeroTimeRange:     (v) => set({ heroTimeRange: v }),
      resetAll:             () => set(DEFAULTS),
    }),
    { name: "parallaxtv-settings" }
  )
);