import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { createJellyfinApi } from "../lib/jellyfinApi";
import { HeroBanner } from "../components/media/HeroBanner";
import { MediaRow } from "../components/media/MediaRow";
import { ProfileMenu } from "../components/ui/ProfileMenu";
import { LibraryRow } from "../components/media/LibraryRow";
import { GlobalSearch } from "../components/ui/GlobalSearch";
import { LibraryRecentRows } from "../components/media/LibraryRecentRow";
import { GenreRows } from "../components/media/GenreRows";
import { WatchHistoryRow } from "../components/media/WatchHistoryRow";
import { NewEpisodesRow } from "../components/media/NewEpisodesRow";
import { SurpriseMe } from "../components/ui/SurpriseMe";
import { ContinueWatchingRow } from "../components/media/ContinueWatchingRow";
import { UpNextRow } from "../components/media/UpNextRow";
import { BecauseYouWatchedRow } from "../components/media/BecauseYouWatchedRow";
import { DiscoveryRow } from "../components/media/DiscoveryRow";
import { useAnimeEnrichment } from "../hooks/useAnimeEnrichment";

// Import the logo
import logo from "../assets/parallaxtv_logo.svg";

// ─── Parallax API Fetch ──────────────────────────────────────────────────────
const PARALLAX_API_URL = "https://parallax-api.parallaxtv-api.workers.dev/api/trending";
const TMDB_CACHE_KEY = "parallax_tmdb_trending";
const TMDB_CACHE_TTL = 24 * 60 * 60 * 1000;

function normTitle(t: string) {
  return t.toLowerCase().replace(/^(the |a |an )/i,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
}

async function getTmdbTrending(): Promise<{ title: string; year: number | null; rank: number }[]> {
  try {
    const cached = localStorage.getItem(TMDB_CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < TMDB_CACHE_TTL) return data;
    }
  } catch {}

  try {
    const res = await fetch(PARALLAX_API_URL);
    const json = await res.json();
    
    if (json.success && json.data) {
      try { localStorage.setItem(TMDB_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: json.data })); } catch {}
      return json.data;
    }
    return [];
  } catch {
    console.error("Failed to fetch from Parallax API");
    return []; 
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard({ authData, onLogout }: { authData: any; onLogout: () => void }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  // refreshKey increments every time the user comes back to this page
  // triggering a re-fetch of Continue Watching and Up Next
  const [refreshKey, setRefreshKey] = useState(0);

  // Silently enriches Worker KV with AniList data + reports library stats
  useAnimeEnrichment(authData);

  const [top10Items,        setTop10Items]        = useState<any[]>([]);
  const [myList,            setMyList]            = useState<any[]>([]);
  const [recentMovies,      setRecentMovies]       = useState<any[]>([]);
  const [recentShows,       setRecentShows]        = useState<any[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingTop10,    setLoadingTop10]    = useState(true);
  const [loadingMyList,   setLoadingMyList]   = useState(true);
  const [loadingMovies,   setLoadingMovies]   = useState(true);
  const [loadingShows,    setLoadingShows]    = useState(true);

  useEffect(() => { if (!authData) navigate("/"); }, [authData, navigate]);

  // Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, [location.key]);

  // Also re-fetch when window regains focus (user alt-tabs back)
  useEffect(() => {
    const onFocus = () => setRefreshKey(k => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // ── 2. Top 10 in Your Library ─────────────────────────────────────────────
  // Cross-reference TMDB weekly trending with what's actually in the library
  useEffect(() => {
    if (!authData) return;
    async function load() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        // Fetch a broad pool — sorted by DateCreated descending so recent items surface first
        const res = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: ["Movie", "Series"],
          recursive: true,
          sortBy: ["DateCreated"],
          sortOrder: [SortOrder.Descending],
          limit: 200,
          fields: ["CommunityRating", "ImageTags", "ProductionYear", "Genres", "DateCreated"] as any,
        });

        const library = res.data.Items ?? [];
        if (library.length === 0) { setLoadingTop10(false); return; }

        const now = Date.now();
        const threeYearsMs  = 3 * 365 * 24 * 60 * 60 * 1000;
        const oneYearMs     = 1 * 365 * 24 * 60 * 60 * 1000;

        // Fetch from Cloudflare Worker
        const trending = await getTmdbTrending();

        let top10: any[] = [];

        if (trending.length > 0) {
          // Match library items against Parallax API trending list
          const tmdbMatched: any[] = [];
          const tmdbMatchedIds = new Set<string>();

          trending.forEach(t => {
            const match = library.find((item: any) => {
              const norm = normTitle(item.Name ?? "");
              if (norm !== t.title) return false;
              const year = item.ProductionYear ?? null;
              if (t.year && year) return Math.abs(t.year - year) <= 1;
              return true;
            });
            if (match?.Id && !tmdbMatchedIds.has(match.Id)) {
              tmdbMatched.push(match);
              tmdbMatchedIds.add(match.Id);
            }
          });

          if (tmdbMatched.length >= 5) {
            // Enough API matches — use them in trending rank order
            top10 = tmdbMatched.slice(0, 10);
          } else {
            // Not enough matches in library — fall through to recency+rating scoring below
            // but boost the ones that did match
            const recentPool = library.filter((item: any) => {
              const added = item.DateCreated ? new Date(item.DateCreated).getTime() : 0;
              const year  = item.ProductionYear ?? 0;
              const currentYear = new Date().getFullYear();
              // Keep if added within 3 years OR released within last 3 years
              return (now - added < threeYearsMs) || (currentYear - year <= 3);
            });

            const pool = recentPool.length >= 10 ? recentPool : library;
            const scored = pool.map((item: any) => {
              const isMatched = tmdbMatchedIds.has(item.Id);
              const added = item.DateCreated ? new Date(item.DateCreated).getTime() : 0;
              const recencyBoost = now - added < oneYearMs ? 50 : 0;
              return {
                item,
                score: (isMatched ? 500 : 0) + recencyBoost + (item.CommunityRating ?? 0) * 10,
              };
            });
            scored.sort((a, b) => b.score - a.score);
            top10 = scored.slice(0, 10).map(s => s.item);
          }
        } else {
          // No API Response fallback — use recent items sorted by community rating
          const currentYear = new Date().getFullYear();
          const recentPool = library.filter((item: any) => {
            const year = item.ProductionYear ?? 0;
            return currentYear - year <= 3;
          });
          const pool = recentPool.length >= 10 ? recentPool : library;
          pool.sort((a: any, b: any) => (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0));
          top10 = pool.slice(0, 10);
        }

        if (top10.length < 10) {
          const selectedIds = new Set(top10.map((item: any) => item.Id));
          const fillItems = library
            .filter((item: any) => !selectedIds.has(item.Id))
            .sort((a: any, b: any) => {
              const aDate = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
              const bDate = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
              const aScore = (a.CommunityRating ?? 0) * 10 + (now - aDate < oneYearMs ? 50 : 0);
              const bScore = (b.CommunityRating ?? 0) * 10 + (now - bDate < oneYearMs ? 50 : 0);
              return bScore - aScore;
            });
          top10 = [...top10, ...fillItems].slice(0, 10);
        }

        setTop10Items(top10);
      } catch (err) {
        console.error("Top 10 failed", err);
      } finally {
        setLoadingTop10(false);
      }
    }
    load();
  }, [authData]);

  // ── 3. My List ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authData) return;
    async function load() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        const res = await itemsApi.getItems({
          userId: authData.userId,
          isFavorite: true,
          recursive: true,
          includeItemTypes: ["Movie", "Series"],
          sortBy: ["DateCreated"],
          sortOrder: [SortOrder.Descending],
          fields: ["CommunityRating", "ImageTags", "ProductionYear"] as any,
          limit: 40,
        });
        setMyList(res.data.Items ?? []);
      } catch (err) {
        console.error("My List failed", err);
      } finally {
        setLoadingMyList(false);
      }
    }
    load();
  }, [authData]);

  // ── 4. Recently Added Movies ──────────────────────────────────────────────
  useEffect(() => {
    if (!authData) return;
    async function load() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        const res = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: ["Movie"],
          recursive: true,
          sortBy: ["DateCreated"],
          sortOrder: [SortOrder.Descending],
          fields: ["CommunityRating", "ImageTags", "ProductionYear"] as any,
          limit: 30,
        });
        setRecentMovies(res.data.Items ?? []);
      } catch (err) {
        console.error("Recent Movies failed", err);
      } finally {
        setLoadingMovies(false);
      }
    }
    load();
  }, [authData]);

  // ── 5. Recently Added TV Shows ────────────────────────────────────────────
  useEffect(() => {
    if (!authData) return;
    async function load() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        const res = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: ["Series"],
          recursive: true,
          sortBy: ["DateCreated"],
          sortOrder: [SortOrder.Descending],
          fields: ["CommunityRating", "ImageTags", "ProductionYear"] as any,
          limit: 30,
        });
        setRecentShows(res.data.Items ?? []);
      } catch (err) {
        console.error("Recent Shows failed", err);
      } finally {
        setLoadingShows(false);
      }
    }
    load();
  }, [authData]);

  if (!authData) return null;

  return (
    <div className="min-h-screen bg-[#141414] text-white animate-[fadeIn_0.3s_ease-out] overflow-x-hidden">

      {/* Floating header */}
      <div className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-12 py-5 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <img 
          src={logo} 
          alt="Parallax TV" 
          className="h-8 w-auto drop-shadow-md pointer-events-none" 
        />

        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 bg-white/8 hover:bg-white/15 border border-white/10
              hover:border-white/25 text-gray-400 hover:text-white backdrop-blur-sm
              px-4 py-2 rounded-full transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            <span className="hidden sm:inline text-xs font-medium">Search</span>
            <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] text-gray-600 border border-white/10 px-1.5 py-0.5 rounded">
              Ctrl K
            </kbd>
          </button>

          <SurpriseMe authData={authData} />
          <ProfileMenu authData={authData} onLogout={onLogout} />
        </div>
      </div>

      {/* Global search overlay */}
      <GlobalSearch authData={authData} open={searchOpen} onClose={() => setSearchOpen(false)} />

      <HeroBanner authData={authData} />

      <div className="px-12 pb-24 relative z-20 mt-6 space-y-2">

        <LibraryRow authData={authData} />

        <MediaRow
          title="Top 10 Trending in Your Library"
          items={top10Items}
          loading={loadingTop10}
          variant="top10"
          authData={authData}
        />

        <ContinueWatchingRow 
          authData={authData} 
          refreshKey={refreshKey} 
        />

        <UpNextRow 
          authData={authData} 
          refreshKey={refreshKey} 
          onInteraction={() => setRefreshKey(k => k + 1)} 
        />

        <NewEpisodesRow authData={authData} />

        <GenreRows authData={authData} />

        {/* Global discovery rows */}
        <div className="mt-16 pt-8 border-t border-white/10 relative">
          <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-red-600 to-transparent" />
          <h2 className="text-2xl font-black text-white/90 mb-6 flex items-center gap-3">
            <span className="w-1.5 h-6 bg-red-600 inline-block rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
            Global Discovery
          </h2>
          
          <DiscoveryRow type="movies" title="Trending Movies Worldwide" authData={authData} />
          <DiscoveryRow type="anime" title="Trending Anime Worldwide" authData={authData} />
          <DiscoveryRow type="seasonal" title="This Season's Anime" authData={authData} />
          <DiscoveryRow type="kdrama" title="Trending K-Dramas" authData={authData} />
        </div>

        <BecauseYouWatchedRow 
          authData={authData} 
          refreshKey={refreshKey} 
        />

        <MediaRow
          title="My List"
          items={myList}
          loading={loadingMyList}
          variant="poster"
          authData={authData}
          count
        />

        <WatchHistoryRow 
          authData={authData} 
          refreshKey={refreshKey} 
          onInteraction={() => setRefreshKey(k => k + 1)} 
        />

        <MediaRow
          title="Recently Added Movies"
          items={recentMovies}
          loading={loadingMovies}
          variant="poster"
          authData={authData}
        />

        <MediaRow
          title="Recently Added TV Shows"
          items={recentShows}
          loading={loadingShows}
          variant="poster"
          authData={authData}
        />


        <LibraryRecentRows authData={authData} recentDays={60} />

      </div>
    </div>
  );
}
