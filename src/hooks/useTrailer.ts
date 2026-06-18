// hooks/useTrailer.ts
import { useState, useEffect, useRef } from "react";

const API = "https://parallax-api.parallaxtv-api.workers.dev";

interface UseTrailerOptions {
  itemId?: string;
  itemName?: string;
  itemType?: string;
  genres?: string[];
  providerIds?: Record<string, string>;
  remoteTrailers?: any[];
  autoPlayDelay?: number; // ms, default 6000
}

export function useTrailer({
  itemId,
  itemName = "",
  itemType,
  genres = [],
  providerIds = {},
  remoteTrailers = [],
  autoPlayDelay = 6000,
}: UseTrailerOptions) {
  const [trailerKey, setTrailerKey]         = useState<string | null>(null);
  const [showTrailer, setShowTrailer]       = useState(false);
  const [trailerCountdown, setTrailerCountdown] = useState(0);


  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── Auto-show countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowTrailer(false);
    setTrailerCountdown(0);

    if (!trailerKey) return;

    const STEP = 50;
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += STEP;
      setTrailerCountdown(Math.min(100, (elapsed / autoPlayDelay) * 100));
    }, STEP);

    timerRef.current = setTimeout(() => {
      setShowTrailer(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, autoPlayDelay);

    return () => {
      if (timerRef.current)    clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trailerKey, itemId, autoPlayDelay]);

  const cancelCountdown = () => {
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
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