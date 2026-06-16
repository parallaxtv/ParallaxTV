export interface MediaItem {
  Id: string;
  Name: string;
  Type: string;
  Overview?: string;
  CommunityRating?: number;
  ProductionYear?: number;
  RunTimeTicks?: number;
  OfficialRating?: string;
  Genres?: string[];
  ImageTags?: {
    Primary?: string;
    Logo?: string;
    Backdrop?: string;
  };
  BackdropImageTags?: string[];
  DateCreated?: string;
  UserData?: {
    PlaybackPositionTicks?: number;
    Played?: boolean;
    IsFavorite?: boolean;
  };
  
  // Optional TV Show / Episode specific fields used in your rows
  SeriesId?: string;
  SeriesName?: string;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  OriginalTitle?: string;
  GenreItems?: { Id: string; Name: string }[];
}