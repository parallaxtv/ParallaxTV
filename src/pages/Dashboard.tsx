import { getLatestMedia, getMyList } from "../services/jellyfin/items";
import { getTop10TrendingInLibrary } from "../services/discovery/trending";
import { useMediaCollection } from "../hooks/useMediaCollection";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthData } from "../types/auth";
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
import { useSettings } from "../store/settings";

import logo from "../assets/parallaxtv_logo.svg";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard({ authData, onLogout }: { authData: AuthData; onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [refreshKey, setRefreshKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  // ─── Settings ───────────────────────────────────────────────────────────────
  const {
    theme,
    backdropBlur,
    animationsEnabled,
    showMovies,
    showAnime,
    showKDrama,
  } = useSettings();

  const themeBg = {
    dark:     "bg-[#141414]",
    amoled:   "bg-black",
    midnight: "bg-[#0d1117]",
  }[theme];

  // Silently enriches Worker KV with AniList data + reports library stats
  useAnimeEnrichment(authData);

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

  useEffect(() => {
    const onFocus = () => setRefreshKey(k => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const { items: top10Items, loading: loadingTop10 } = useMediaCollection(
    async () => authData ? getTop10TrendingInLibrary(authData) : [],
    [authData]
  );

  const { items: myList, loading: loadingMyList } = useMediaCollection(
    async () => authData ? getMyList(authData) : [],
    [authData]
  );

  const { items: recentMovies, loading: loadingMovies } = useMediaCollection(
    async () => authData ? getLatestMedia(authData, ["Movie"], 30) : [],
    [authData]
  );

  const { items: recentShows, loading: loadingShows } = useMediaCollection(
    async () => authData ? getLatestMedia(authData, ["Series"], 30) : [],
    [authData]
  );

  if (!authData) return null;

  const showDiscoverySection = showMovies || showAnime || showKDrama;

  return (
    <div className={`min-h-screen ${themeBg} text-white overflow-x-hidden
      ${animationsEnabled ? "animate-[fadeIn_0.3s_ease-out]" : ""}`}>

      {/* Floating header */}
      <div className="fixed top-8 left-0 w-full z-50 flex items-center justify-between px-12 py-5
        bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <img
          src={logo}
          alt="Parallax TV"
          className="h-8 w-auto drop-shadow-md pointer-events-none"
        />

        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className={`flex items-center gap-2.5 bg-white/8 hover:bg-white/15 border border-white/10
              hover:border-white/25 text-gray-400 hover:text-white px-4 py-2 rounded-full
              transition-all duration-200 text-sm backdrop-blur-sm`}
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

        <ContinueWatchingRow authData={authData} refreshKey={refreshKey} />

        <UpNextRow
          authData={authData}
          refreshKey={refreshKey}
          onInteraction={() => setRefreshKey(k => k + 1)}
        />

        <NewEpisodesRow authData={authData} />

        <GenreRows authData={authData} />

        {/* Global discovery rows — controlled by Discovery settings */}
        {showDiscoverySection && (
          <div className="mt-16 pt-8 border-t border-white/10 relative">
            <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-red-600 to-transparent" />
            <h2 className="text-2xl font-black text-white/90 mb-6 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-red-600 inline-block rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
              Global Discovery
            </h2>

            {showMovies && (
              <DiscoveryRow type="movies" title="Trending Movies Worldwide" authData={authData} />
            )}
            {showAnime && (
              <>
                <DiscoveryRow type="anime"    title="Trending Anime Worldwide" authData={authData} />
                <DiscoveryRow type="seasonal" title="This Season's Anime"      authData={authData} />
              </>
            )}
            {showKDrama && (
              <DiscoveryRow type="kdrama" title="Trending K-Dramas" authData={authData} />
            )}
          </div>
        )}

        <BecauseYouWatchedRow authData={authData} refreshKey={refreshKey} />

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