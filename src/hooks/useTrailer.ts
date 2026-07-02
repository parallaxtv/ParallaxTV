// hooks/useTrailer.ts
import { useState, useEffect } from "react";

const API = "https://parallax-api.parallaxtv-api.workers.dev";

interface UseTrailerOptions {
  itemId?: string;
  itemName?: string;
  itemType?: string;
  genres?: string[];
  providerIds?: Record<string, string>;
  remoteTrailers?: any[];
}

export function useTrailer({
  itemId,
  itemName = "",
  itemType,
  genres = [],
  providerIds = {},
  remoteTrailers = [],
}: UseTrailerOptions) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerCountdown, setTrailerCountdown] = useState(0);

  // ── Fetch trailer key ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!itemId) return;
    setTrailerKey(null);
    setShowTrailer(false);

    async function fetchTrailer() {
      try {
        // 1. Prefer RemoteTrailers embedded in item
        for (const t of remoteTrailers) {
          const url = t.Url ?? t.url ?? "";
          const ytMatch = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
          if (ytMatch) { setTrailerKey(ytMatch[1]); return; }
        }

        const isAnime = genres.some((g) => /anime/i.test(g));
        let endpoint  = "";

        if (isAnime) {
          const searchRes  = await fetch(`${API}/api/anime/search?q=${encodeURIComponent(itemName)}`);
          const searchData = await searchRes.json();
          const match      = searchData?.data?.[0];
          if (!match?.malId) return;
          const detailRes  = await fetch(`${API}/api/anime/${match.malId}`);
          const detailData = await detailRes.json();
          const trailerUrl = detailData?.data?.trailerUrl;
          if (trailerUrl) {
            const ytMatch = trailerUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
            if (ytMatch) setTrailerKey(ytMatch[1]);
          }
          return;
        }

        if (itemType === "Series") {
          const tmdbId = providerIds?.Tmdb;
          if (tmdbId) endpoint = `${API}/api/kdrama/${tmdbId}`;
        } else {
          const tmdbId = providerIds?.Tmdb;
          if (tmdbId) endpoint = `${API}/api/movies/${tmdbId}`;
        }

        if (!endpoint) return;
        const res  = await fetch(endpoint);
        const data = await res.json();
        if (data?.data?.trailer?.key) setTrailerKey(data.data.trailer.key);
      } catch { /* non-fatal */ }
    }

    fetchTrailer();
  }, [itemId, providerIds?.Tmdb]);

  useEffect(() => {
    setShowTrailer(false);
    setTrailerCountdown(0);
  }, [trailerKey, itemId]);

  const cancelCountdown = () => {
    setTrailerCountdown(0);
  };

  return {
    trailerKey,
    showTrailer,
    trailerCountdown,
    setShowTrailer,
    cancelCountdown,
    hideTrailer: () => { setShowTrailer(false); cancelCountdown(); },
    showTrailerNow: () => { setShowTrailer(true); cancelCountdown(); },
  };
}