import { MediaItem } from "../types/media";

export function isEpisode(item: MediaItem) {
  return item.Type === "Episode" || Boolean(item.SeriesId);
}

export function isMovie(item: MediaItem) {
  return item.Type === "Movie";
}

export function isSeries(item: MediaItem) {
  return item.Type === "Series";
}