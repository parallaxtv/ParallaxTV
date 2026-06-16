export interface DiscoveryCast {
  // TMDB / Worker format
  name?: string;
  character?: string;
  profileUrl?: string;
  
  // MyAnimeList / Jikan format (used in CastStrip)
  actorName?: string;
  actorImage?: string;
  charName?: string;
  charImage?: string;
}

export interface DiscoveryItem {
  id: number | string;
  title: string;
  altTitle?: string;
  nativeTitle?: string;
  year?: number;
  posterUrl?: string;
  backdropUrl?: string;
  description?: string;
  genres?: string[];
  rating?: number;
  score?: number;
  accentColor?: string;
  trailerUrl?: string;
  malId?: number | string;
  studio?: string;
  cast?: DiscoveryCast[];
}

export interface DiscoveryDetail {
  runtime?: number;
  tagline?: string;
  description?: string;
  genres?: string[];
  rating?: number;
  cast?: DiscoveryCast[];
  similar?: DiscoveryItem[];
  trailer?: {
    youtubeUrl?: string;
  };
}