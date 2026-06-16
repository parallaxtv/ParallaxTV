import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { PlayButton, GhostButton } from "../ui/Buttons";
import { StarRating } from "../ui/StarRating";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { AuthData } from "../../types/auth";
import { MediaItem } from "../../types/media";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRuntime(ticks: number | undefined): string {
  if (!ticks) return "";
  const totalMinutes = Math.floor(ticks / 600_000_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getImageUrl(
  serverUrl: string,
  token: string,
  itemId: string,
  type: "Backdrop" | "Logo" | "Primary",
  width = 1920
) {
  return `${serverUrl}/Items/${itemId}/Images/${type}?fillWidth=${width}&quality=90&api_key=${token}`;
}

/** Normalize a title for fuzzy matching: lowercase, strip punctuation/articles */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(the |a |an )/i, "")   // strip leading articles
    .replace(/[^a-z0-9\s]/g, "")      // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Parallax API Fetch ──────────────────────────────────────────────────────

interface TmdbEntry {
  title: string;
  year: number | null;
  rank: number;
  type: string;
}

const PARALLAX_API_URL = "https://parallax-api.parallaxtv-api.workers.dev/api/trending";
const TMDB_CACHE_KEY = "parallax_tmdb_trending";
const TMDB_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchTmdbTrending(): Promise<TmdbEntry[]> {
  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(TMDB_CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < TMDB_CACHE_TTL) {
        console.log("[HeroBanner] Using cached Parallax API data");
        return data as TmdbEntry[];
      }
    }
  } catch {
    // Cache read failed, fetch fresh
  }

  // Fetch fresh from Cloudflare Worker
  console.log("[HeroBanner] Fetching fresh Parallax API data");
  try {
    const res = await fetch(PARALLAX_API_URL);
    const json = await res.json();
    
    if (json.success && json.data) {
      // Save to cache
      try {
        localStorage.setItem(
          TMDB_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), data: json.data })
        );
      } catch {}
      return json.data;
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch from Parallax API:", err);
    return [];
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeroItem extends MediaItem {
  // Injected metadata
  _trendingRank?: number;       // lower = more trending
  _isNewlyAdded?: boolean;      // added in last 14 days
  _isTrending?: boolean;
  _score?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HeroBanner({ authData }: { authData: AuthData }) {
  const navigate = useNavigate();
  const hasFetched                      = React.useRef(false);
  const [heroPool, setHeroPool]         = useState<HeroItem[]>([]); // full scored pool
  const [heroItems, setHeroItems]       = useState<HeroItem[]>([]); // current 6 on screen
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused]         = useState(false);
  const [trendingBadge, setTrendingBadge] = useState<string | null>(null);
  const poolOffsetRef                   = React.useRef(0); // tracks where we are in the pool

  // ── Main fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authData) return;

    // Guard against React StrictMode double-invoke in development
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function buildHero() {
      try {
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);

        // 1. Fetch broad pool sorted by DateCreated — recent items first
        const res = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: ["Movie", "Series"],
          recursive: true,
          sortBy: ["DateCreated"],
          sortOrder: [SortOrder.Descending],
          limit: 200,
          fields: [
            "Overview",
            "CommunityRating",
            "Genres",
            "RunTimeTicks",
            "OfficialRating",
            "ImageTags",
            "BackdropImageTags",
            "DateCreated",
          ] as any,
        });

        // Must have a backdrop to appear in the hero
        const allItems: HeroItem[] = (res.data.Items ?? []).filter(
          (item: any) =>
            item.BackdropImageTags?.length > 0 || item.ImageTags?.Backdrop
        ) as HeroItem[];

        if (allItems.length === 0) return;

        const now            = Date.now();
        const fourteenDaysMs = 14  * 24 * 60 * 60 * 1000;
        const oneYearMs      = 365 * 24 * 60 * 60 * 1000;
        const threeYearsMs   = 3 * oneYearMs;
        const currentYear    = new Date().getFullYear();

        // 2. Fetch Parallax API trending (uses 24hr localStorage cache)
        const tmdbTrending = await fetchTmdbTrending();
        const hasTmdb = tmdbTrending.length > 0;

        // 3. Score every item
        const scored = allItems.map((item) => {
          const normName  = normalizeTitle(item.Name ?? "");
          const itemYear  = item.ProductionYear ?? null;
          const addedMs   = item.DateCreated ? new Date(item.DateCreated).getTime() : 0;
          const isNew     = now - addedMs < fourteenDaysMs;
          const isRecent  = (itemYear && currentYear - itemYear <= 3) ||
                            (now - addedMs < threeYearsMs);

          let trendingRank: number | undefined;
          let isTrending = false;

          if (hasTmdb) {
            const match = tmdbTrending.find((t) => {
              if (t.title !== normName) return false;
              if (t.year && itemYear) return Math.abs(t.year - itemYear) <= 1;
              return true;
            });
            if (match) {
              isTrending   = true;
              trendingRank = match.rank;
            }
          }

          // ── Composite score ──────────────────────────────────────────────
          let score = 0;

          // Tier 1: Newly added (last 14 days) + trending = top priority
          if (isNew && isTrending) score += 3000;
          // Tier 2: Trending on TMDB (rank 1 = 998pts, rank 20 = 960pts)
          else if (isTrending && trendingRank != null)
            score += 2000 - trendingRank * 2;
          // Tier 3: Newly added but not on TMDB trending
          else if (isNew) score += 1000;
          // Tier 4: Recent (within 3 years) — still eligible for banner
          else if (isRecent) score += 500;
          // Tier 5: Old content — only as last resort fallback (very low score)
          // no boost

          // Community rating adds up to 100pts on top of tier score
          if (item.CommunityRating) score += item.CommunityRating * 10;

          return {
            ...item,
            _isNewlyAdded: isNew,
            _isTrending:   isTrending,
            _trendingRank: trendingRank,
            _score:        score,
          } as HeroItem;
        });

        // 4. Sort by score descending
        scored.sort((a: any, b: any) => b._score - a._score);

        // 5. Build full pool of up to 30 with variety (no more than 2 from same year)
        const selected: HeroItem[] = [];
        const yearCount: Record<number, number> = {};
        for (const item of scored) {
          if (selected.length >= 30) break;
          const y = item.ProductionYear ?? 0;
          if ((yearCount[y] ?? 0) >= 3) continue; // allow 3 per year in full pool
          selected.push(item);
          yearCount[y] = (yearCount[y] ?? 0) + 1;
        }
        // Top off if needed
        if (selected.length < 6) {
          for (const item of scored) {
            if (selected.length >= 6) break;
            if (!selected.find((s: HeroItem) => s.Id === item.Id)) selected.push(item);
          }
        }

        // Store the full pool and show the first 6
        setHeroPool(scored);
        poolOffsetRef.current = 0;
        setHeroItems(scored.slice(0, Math.min(6, scored.length)));
        console.log("[HeroBanner] Pool size:", scored.length, "showing first 6");
      } catch (err) {
        console.error("Failed to build hero banner:", err);
      }
    }

    buildHero();
  }, [authData]);

  // Update badge when slide changes
  useEffect(() => {
    const item = heroItems[currentIndex];
    if (!item) { setTrendingBadge(null); return; }

    if (item._isNewlyAdded && item._isTrending) {
      setTrendingBadge("🔥 New & Trending");
    } else if (item._isTrending && item._trendingRank != null) {
      setTrendingBadge(`🔥 #${item._trendingRank} Trending This Week`);
    } else if (item._isNewlyAdded) {
      setTrendingBadge("✨ Recently Added");
    } else {
      setTrendingBadge(null);
    }
  }, [currentIndex, heroItems]);

  // ── Slide transition ───────────────────────────────────────────────────────
  const goTo = useCallback(
    (idx: number) => {
      if (idx === currentIndex || isTransitioning) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(idx);
        setIsTransitioning(false);
      }, 400);
    },
    [currentIndex, isTransitioning]
  );

  // ── Auto-rotate — advance through pool, loading new batch every 6 slides ───
  useEffect(() => {
    if (heroItems.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= heroItems.length) {
            // End of current batch — load next 6 from pool
            if (heroPool.length > 6) {
              const newOffset = (poolOffsetRef.current + 6) % heroPool.length;
              poolOffsetRef.current = newOffset;
              // Build next batch: 6 items starting at newOffset, wrapping around
              const nextBatch: HeroItem[] = [];
              for (let i = 0; i < 6; i++) {
                nextBatch.push(heroPool[(newOffset + i) % heroPool.length]);
              }
              setHeroItems(nextBatch);
            }
            return 0;
          }
          return next;
        });
        setIsTransitioning(false);
      }, 400);
    }, 9000);
    return () => clearInterval(timer);
  }, [heroItems.length, isPaused, heroPool]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (heroItems.length === 0) {
    return (
      <div className="w-full h-[75vh] min-h-[560px] bg-[#141414] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#242424] to-[#1a1a1a] animate-pulse" />
        <div className="absolute bottom-16 left-12 space-y-3">
          <div className="h-10 w-64 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-96 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-80 bg-white/10 rounded animate-pulse" />
          <div className="flex gap-3 mt-4">
            <div className="h-10 w-28 bg-white/20 rounded animate-pulse" />
            <div className="h-10 w-28 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const current = heroItems[currentIndex];
  const runtime = formatRuntime(current.RunTimeTicks);
  const genres  = current.Genres?.slice(0, 3) ?? [];

  return (
    <div
      className="w-full h-[75vh] min-h-[560px] relative overflow-hidden bg-[#141414]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Background images ─────────────────────────────────────────────── */}
      {heroItems.map((item, idx) => (
        <div
          key={item.Id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: idx === currentIndex ? 1 : 0,
            zIndex:  idx === currentIndex ? 1 : 0,
          }}
        >
          <img
            src={getImageUrl(authData.serverUrl, authData.token, item.Id, "Backdrop", 1920)}
            alt={item.Name}
            className="w-full h-full object-cover object-top"
            style={{
              transform:  idx === currentIndex ? "scale(1)"    : "scale(1.02)",
              transition: "transform 8s ease-out",
            }}
          />
        </div>
      ))}

      {/* ── Gradients ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-12 pb-14 pt-8"
        style={{
          opacity:   isTransitioning ? 0 : 1,
          transform: isTransitioning ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* Trending / New badge */}
        {trendingBadge && (
          <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-bold tracking-wide uppercase shadow-lg">
            {trendingBadge}
          </div>
        )}

        {/* Logo or title */}
        {current.ImageTags?.Logo ? (
          <img
            src={getImageUrl(authData.serverUrl, authData.token, current.Id, "Logo", 480)}
            alt={current.Name}
            className="mb-4 w-auto max-w-[280px] max-h-[90px] object-contain drop-shadow-2xl"
          />
        ) : (
          <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg leading-tight tracking-tight">
            {current.Name}
          </h1>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {current.CommunityRating && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={current.CommunityRating} />
            </div>
          )}

          {current.ProductionYear && (
            <span className="text-gray-300 text-xs font-semibold">
              {current.ProductionYear}
            </span>
          )}

          {runtime && (
            <span className="text-gray-300 text-xs font-semibold">{runtime}</span>
          )}

          {current.OfficialRating && (
            <span className="border border-gray-500 text-gray-300 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider">
              {current.OfficialRating}
            </span>
          )}

          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded font-bold tracking-wider uppercase">
            {current.Type === "Series" ? "TV Show" : "Movie"}
          </span>
        </div>

        {/* Genre pills */}
        {genres.length > 0 && (
          <div className="flex gap-2 mb-4">
            {genres.map((g) => (
              <span
                key={g}
                className="text-[11px] text-gray-300 font-medium px-3 py-0.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Overview */}
        {current.Overview && (
          <p className="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-2 max-w-lg drop-shadow font-medium">
            {current.Overview}
          </p>
        )}

        {/* CTA */}
        <div className="flex gap-3">
          <PlayButton
            onClick={() => navigate(`/title/${current.Id}`, { state: { item: current } })}
          />
          <GhostButton
            onClick={() => navigate(`/title/${current.Id}`, { state: { item: current } })}
          >
            More Info
          </GhostButton>
        </div>
      </div>

      {/* ── Dot indicators ────────────────────────────────────────────────── */}
      <div className="absolute bottom-14 right-12 z-20 flex items-center gap-2">
        {heroItems.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-7 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      {!isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] z-30 bg-white/10">
          <div
            key={currentIndex}
            className="h-full bg-red-600/80"
            style={{ animation: "progressBar 9s linear forwards" }}
          />
        </div>
      )}

      <style>{`
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}