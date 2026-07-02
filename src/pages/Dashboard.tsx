import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthData } from "../types/auth";
import { useSettings } from "../store/settings";
import { useAnimeEnrichment } from "../hooks/useAnimeEnrichment";
import { useMediaCollection } from "../hooks/useMediaCollection";
import { getLatestMedia, getMyList } from "../services/jellyfin/items";
import { getTop10TrendingInLibrary } from "../services/discovery/trending";

// Components
import { Sidebar, Icons } from "../components/ui/Sidebar";
import { HeroBanner } from "../components/media/HeroBanner";
import { GlobalSearch } from "../components/ui/GlobalSearch";
import { SurpriseMe } from "../components/ui/SurpriseMe";
import { SectionHeader } from "../components/ui/SectionHeader";
import { NotificationPanel } from "../components/ui/NotificationPanel";
import { useNotifications } from "../hooks/useNotifications";
import { useUnreadCount } from "../store/notifications";

// Rows
import { ContinueWatchingRow } from "../components/media/ContinueWatchingRow";
import { UpNextRow } from "../components/media/UpNextRow";
import { MediaRow } from "../components/media/MediaRow";
import { LibraryRow } from "../components/media/LibraryRow";
import { GenreRows } from "../components/media/GenreRows";
import { WatchHistoryRow } from "../components/media/WatchHistoryRow";
import { NewEpisodesRow } from "../components/media/NewEpisodesRow";
import { BecauseYouWatchedRow } from "../components/media/BecauseYouWatchedRow";
import { DiscoveryRow } from "../components/media/DiscoveryRow";
import { LibraryRecentRows } from "../components/media/LibraryRecentRow";

import hero1 from "../assets/backdrops/hero-1.jpg";
import hero2 from "../assets/backdrops/hero-2.jpg";
import hero3 from "../assets/backdrops/hero-3.jpg";
import hero4 from "../assets/backdrops/hero-4.jpg";
import hero5 from "../assets/backdrops/hero-5.jpg";

// ─── Design tokens ────────────────────────────────────────────────────────────
const OCEAN = "#38bdf8";
const BACKDROP_ROTATE_MS = 60_000; // Rotate every 1 minute
const CUSTOM_BACKDROPS = [hero1, hero2, hero3, hero4, hero5];

// Helper array for DRY buttons
const TOP_10_RANGES = ["today", "week", "month", "year"] as const;

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function Dashboard({ authData, onLogout }: { authData: AuthData; onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useNotifications(authData);
  const unreadCount = useUnreadCount();

  // Backdrop state
  const [backdropIndex, setBackdropIndex] = useState(0);

  const { animationsEnabled, showMovies, showAnime, showKDrama } = useSettings();
  useAnimeEnrichment(authData);
  const [top10Range, setTop10Range] = useState<"today" | "week" | "month" | "year">("week");

  useEffect(() => { if (!authData) navigate("/"); }, [authData, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(v => !v); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // ── Rotate custom backdrop every 1 minute ──
  useEffect(() => {
    const id = setInterval(() => {
      setBackdropIndex(i => (i + 1) % CUSTOM_BACKDROPS.length);
    }, BACKDROP_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const { items: top10Items, loading: loadingTop10 } = useMediaCollection(
    async () => authData ? getTop10TrendingInLibrary(authData, top10Range) : [],
    [authData, top10Range]
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
  const openSearch = () => { setSearchOpen(true); setMobileMenuOpen(false); };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const currentBackdropUrl = CUSTOM_BACKDROPS[backdropIndex];

  return (
    <div className={`relative flex h-screen text-white overflow-hidden ${animationsEnabled ? "animate-[fadeIn_0.3s_ease-out]" : ""}`}>

      {/* ── Cinematic backdrop ── */}
      <div className="absolute inset-0 -z-10 bg-[#0B0B0F]">
        {currentBackdropUrl && (
          <img
            key={currentBackdropUrl}
            src={currentBackdropUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-110 animate-[fadeIn_1.5s_ease-in-out]"
            style={{
              filter: "blur(24px) saturate(1.2) brightness(0.6)",
              objectPosition: "center top",
            }}
          />
        )}
        <div className="absolute inset-0 bg-[#0B0B0F]/50" />
        <div
          className="absolute bottom-0 inset-x-0 h-64 pointer-events-none"
          style={{ background: `linear-gradient(to top, rgba(56,189,248,0.06), transparent)` }}
        />
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Extracted Sidebar ── */}
      <Sidebar 
        authData={authData} 
        onLogout={onLogout} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
      />

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col relative h-screen overflow-y-auto scrollbar-hide">

        {/* Glassmorphism sticky header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 xl:px-10 pt-12 pb-5 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(11,11,15,0.55) 0%, rgba(11,11,15,0.25) 50%, transparent 100%)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="xl:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Icons.Menu />
            </button>
            <div className="leading-tight">
              <p className="text-xs text-gray-500 font-medium">{greeting}</p>
              <p className="text-base font-semibold text-white">{authData.username}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 pointer-events-auto">
            <button
              onClick={openSearch}
              className="flex items-center gap-3 rounded-full pl-4 pr-3 py-2 w-64 text-gray-500 hover:text-gray-300 transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <Icons.Search />
              <span className="text-sm flex-1 text-left">Search</span>
              <kbd className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded font-mono">Ctrl K</kbd>
            </button>

            <SurpriseMe authData={authData} />

            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Notifications"
              >
                <Icons.Bell />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold leading-4 text-center text-[#071017]"
                    style={{ backgroundColor: OCEAN }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <NotificationPanel
                authData={authData}
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
              />
            </div>
          </div>
        </header>

        <GlobalSearch authData={authData} open={searchOpen} onClose={() => setSearchOpen(false)} />

        <div className="px-6 xl:px-10 pb-24">
          <HeroBanner authData={authData} />

          {/* Full collection of Media Rows restored in logical order */}
          <div className="mt-12 space-y-8">
            <LibraryRow authData={authData} />

            {/* Trending Section */}
            <SectionHeader title="Trending Now" className="mt-8 pt-8 mb-6" />
            
            <div className="mb-4 flex items-center justify-between">
              {/* ── Sub-section Header (Discovery Style) ── */}
              <div className="flex items-baseline gap-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
                  <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
                  Top 10 In Library
                </h2>
              </div>

              {/* ── Time Range Filter ── */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-full bg-white/[0.03] p-1 border border-white/[0.04]">
                  {TOP_10_RANGES.map((range) => (
                    <button
                      key={range}
                      onClick={() => setTop10Range(range)}
                      aria-pressed={top10Range === range}
                      disabled={loadingTop10}
                      className={`px-3 py-1 text-sm rounded-full transition-transform duration-150 capitalize ${
                        top10Range === range ? "bg-[var(--color-accent)] text-[#071017]" : "text-slate-300 hover:text-white"
                      } ${loadingTop10 ? "opacity-60 cursor-wait" : "active:scale-95"}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>

                {loadingTop10 && (
                  <div className="ml-3 w-6 h-6 rounded-full border-2 border-white/20 border-t-[var(--color-accent)] animate-spin" aria-hidden />
                )}
              </div>
            </div>
            
            <MediaRow title="" hideHeader items={top10Items} loading={loadingTop10} variant="top10" authData={authData} />

            {/* Jump Back In Section */}
            <SectionHeader title="Jump Back In" />
            <ContinueWatchingRow authData={authData} refreshKey={refreshKey} />
            <UpNextRow authData={authData} refreshKey={refreshKey} onInteraction={() => setRefreshKey(k => k + 1)} />
            <NewEpisodesRow authData={authData} />

            {/* Your Collection Section */}
            <SectionHeader title="Your Collection" />
            
            {/* My List */}
            <div className="mb-10 relative group/row" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
                  <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
                  My List
                </h2>
              </div>
              <MediaRow title="" hideHeader items={myList} loading={loadingMyList} variant="poster" authData={authData} count />
            </div>

            <WatchHistoryRow authData={authData} refreshKey={refreshKey} onInteraction={() => setRefreshKey(k => k + 1)} />

            {/* Recommended For You Section */}
            <SectionHeader title="Recommended For You" />
            <GenreRows authData={authData} />
            <BecauseYouWatchedRow authData={authData} refreshKey={refreshKey} />
            
            {/* Global Discovery Section */}
            {showDiscoverySection && (
              <>
                <SectionHeader title="Global Discovery" />
                {showMovies && <DiscoveryRow type="movies" title="Trending Movies Worldwide" authData={authData} />}
                {showAnime && (
                  <>
                    <DiscoveryRow type="anime" title="Trending Anime Worldwide" authData={authData} />
                    <DiscoveryRow type="seasonal" title="This Season's Anime" authData={authData} />
                  </>
                )}
                {showKDrama && <DiscoveryRow type="kdrama" title="Trending K-Dramas" authData={authData} />}
              </>
            )}
            
            {/* Recently Added Section */}
            <SectionHeader title="Recently Added" />
            
            {/* Recently Added Movies */}
            <div className="mb-10 relative group/row" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
                  <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
                  Recently Added Movies
                </h2>
              </div>
              <MediaRow title="" hideHeader items={recentMovies} loading={loadingMovies} variant="poster" authData={authData} />
            </div>

            {/* Recently Added TV Shows */}
            <div className="mb-10 relative group/row" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
                  <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
                  Recently Added TV Shows
                </h2>
              </div>
              <MediaRow title="" hideHeader items={recentShows} loading={loadingShows} variant="poster" authData={authData} />
            </div>

            <LibraryRecentRows authData={authData} recentDays={60} />
          </div>
        </div>
      </main>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

    </div>
  );
}