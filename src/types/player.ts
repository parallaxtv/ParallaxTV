import { MediaItem } from "./media";

// ─── Streams & Sources (Jellyfin API) ────────────────────────────────────────

export interface MediaStream {
  Index: number;
  Type: "Audio" | "Subtitle" | "Video";
  Language?: string;
  DisplayTitle?: string;
  Codec?: string;
  IsDefault?: boolean;
  IsExternal?: boolean;
}

export interface MediaSource {
  Id: string;
  Name?: string;
  Container?: string;
  RunTimeTicks?: number;
  DefaultAudioStreamIndex?: number;
  DefaultSubtitleStreamIndex?: number;
  MediaStreams?: MediaStream[];
}

// ─── Chapters & Skip Segments ────────────────────────────────────────────────

export interface Chapter {
  StartPositionTicks: number;
  Name: string;
  ImageTag?: string;
}

export type SegmentType = "Introduction" | "Credits" | "Preview" | "Recap" | "Unknown";

export interface SkipSegment {
  type: SegmentType;
  startSecs: number;
  endSecs: number;
}

// ─── TV Show / Episode Specifics ─────────────────────────────────────────────

// An extended version of MediaItem specifically for the player's episode list
export interface EpisodeInfo extends MediaItem {
  IndexNumber: number;
  ParentIndexNumber: number; // Season Number
  Overview?: string;
  SeriesId: string;
  SeasonId: string;
}

export interface SeasonInfo {
  Id: string;
  Name: string;
  IndexNumber?: number;
}

// ─── MPV & Player State (For Zustand/Props) ──────────────────────────────────

export interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
  volume: number;           // 0.0 to 1.0
  currentTimeSecs: number;
  durationSecs: number;
}

export interface PlayerSettingsState {
  showSettings: boolean;
  showEpisodesMenu: boolean;
  autoSkipEnabled: boolean;
  selectedAudio: number | null;
  selectedSubtitle: number | null;
}