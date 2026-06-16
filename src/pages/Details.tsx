import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { PlayButton, GhostButton } from "../components/ui/Buttons";
import { StarRating } from "../components/ui/StarRating";
import { createJellyfinApi } from "../lib/jellyfinApi";

// Import the logo
import logo from "../assets/parallaxtv_logo.svg";

const SAFE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

const API = "https://parallax-api.parallaxtv-api.workers.dev";

// ─── AniList enrichment via Worker ───────────────────────────────────────────
function normTitle(t: string) {
  if (!t) return "";
  return t.toLowerCase().replace(/^(the |a |an )/i,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
}

function stripHtml(html: string) {
  return html?.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim() ?? "";
}

async function fetchAniListCast(titleEn: string, titleRo: string, year?: number): Promise<any[] | null> {
  try {
    // Use Worker search endpoint — it queries Jikan but also returns any
    // AniList-contributed cast data that's been cached in KV
    const res  = await fetch(`${API}/api/anime/search?q=${encodeURIComponent(titleEn || titleRo)}`);
    const data = await res.json();
    if (!data.success) return null;

    const results: any[] = data.data ?? [];
    const n1 = normTitle(titleEn), n2 = normTitle(titleRo);
    const match = results.find((m: any) => {
      const t1 = normTitle(m.title    || "");
      const t2 = normTitle(m.altTitle || "");
      const nameMatch = t1 === n1 || t2 === n1 || t1 === n2 || t2 === n2;
      if (!nameMatch) return false;
      if (year && m.year) return Math.abs(year - m.year) <= 1;
      return true;
    }) ?? results[0];

    if (!match) return null;

    // Return cast if present (from AniList contribution in KV)
    if (match.cast?.length > 0) {
      return match.cast.map((c: any) => ({
        charName:   c.charName   ?? c.character?.name ?? "Unknown",
        charImage:  c.charImage  ?? null,
        actorName:  c.actorName  ?? null,
        actorImage: c.actorImage ?? null,
      }));
    }

    return null; // No cast data yet — fall back to Jellyfin people
  } catch {
    return null;
  }
}

// ─── Arrow Scroll Row ─────────────────────────────────────────────────────────
function ArrowRow({
  children,
  itemWidth = 300,
  gap = 16,
  paddingLeft = 0,
}: {
  children: React.ReactNode;
  itemWidth?: number;
  gap?: number;
  paddingLeft?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(true);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = (itemWidth + gap) * 3;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows);
    return () => el.removeEventListener("scroll", updateArrows);
  }, [children]);

  return (
    <div className="relative group/row" style={{ overflowX: "visible", overflowY: "visible" }}>
      {/* Left arrow */}
      {canLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20
            w-12 h-12 flex items-center justify-center
            bg-black/80 hover:bg-black border border-white/10 hover:border-white/30
            rounded-full text-white shadow-2xl backdrop-blur-sm
            transition-all duration-200 hover:scale-110"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide"
        style={{ gap: `${gap}px`, scrollSnapType: "x mandatory", overflowY: "visible", paddingTop: "8px", paddingBottom: "8px", paddingLeft: paddingLeft ? `${paddingLeft}px` : undefined }}
      >
        {children}
      </div>

      {/* Right arrow */}
      {canRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20
            w-12 h-12 flex items-center justify-center
            bg-black/80 hover:bg-black border border-white/10 hover:border-white/30
            rounded-full text-white shadow-2xl backdrop-blur-sm
            transition-all duration-200 hover:scale-110"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Expandable Overview ─────────────────────────────────────────────────────
function ExpandableOverview({ overview }: { overview?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!overview) return null;

  const CHAR_LIMIT = 220;
  const isLong = overview.length > CHAR_LIMIT;
  const displayed = !isLong || expanded ? overview : overview.slice(0, CHAR_LIMIT).trimEnd() + "…";

  return (
    <div className="max-w-2xl mb-14" style={{ animation: "fadeSlideUp 0.5s 0.1s ease-out both" }}>
      <p className="text-base leading-relaxed text-gray-300">
        {displayed}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white transition-colors group"
        >
          {expanded ? "Show less" : "Read more"}
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-5 flex items-center gap-3">
      <span className="w-4 h-px bg-red-600 inline-block" />
      {children}
    </h3>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function Details({ authData }: { authData: any }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id: routeItemId } = useParams();
  const initialItem = location.state?.item;

  const [item, setItem]                     = useState<any>(initialItem);
  const [seasons, setSeasons]               = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [episodes, setEpisodes]             = useState<any[]>([]);
  const [nextUp, setNextUp]                 = useState<any>(null);
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);
  const [moreLikeThis, setMoreLikeThis]     = useState<any[]>([]);
  const [anilistCast, setAnilistCast]       = useState<any[] | null>(null);
  const [anilistLoading, setAnilistLoading] = useState(false);
  const [trailerKey, setTrailerKey]         = useState<string | null>(null);
  const [showTrailer, setShowTrailer]       = useState(false);
  const [trailerCountdown, setTrailerCountdown] = useState(0); // 0-100 progress
  const [isMuted, setIsMuted]                       = useState(true);
  const trailerTimerRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailerIntervalRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  // System States
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [nextUpLoaded, setNextUpLoaded]     = useState(false);

  useEffect(() => {
    if (!routeItemId) navigate("/dashboard");
  }, [routeItemId, navigate]);

  useEffect(() => {
    setItem(initialItem?.Id === routeItemId ? initialItem : routeItemId ? { Id: routeItemId } : null);
    setSeasons([]);
    setSelectedSeasonId("");
    setEpisodes([]);
    setNextUp(null);
    setNextUpLoaded(false);
    setMoreLikeThis([]);
    setAnilistCast(null);
    setTrailerKey(null);
    setShowTrailer(false);
  }, [routeItemId]);

  // 1. Fresh item data
  useEffect(() => {
    if (!routeItemId || !authData) return;
    async function fetchFreshItem() {
      try {
        // ADDED: UserData to the fields request so we know if the movie/show itself is watched
        // ADDED: ProviderIds so the trailer logic knows the TMDB ID!
        const fields = "Overview,CommunityRating,Genres,GenreItems,People,RunTimeTicks,OfficialRating,ImageTags,BackdropImageTags,UserData,ProviderIds,RemoteTrailers";
        const res  = await fetch(`${authData.serverUrl}/Users/${authData.userId}/Items/${routeItemId}?fields=${fields}&api_key=${authData.token}`);
        const data = await res.json();
        if (data.Type === "Episode" && data.SeriesId) {
          const seriesRes = await fetch(`${authData.serverUrl}/Users/${authData.userId}/Items/${data.SeriesId}?fields=${fields}&api_key=${authData.token}`);
          const seriesData = await seriesRes.json();
          setItem(seriesData);
          navigate(`/title/${data.SeriesId}`, { state: { item: seriesData }, replace: true });
          return;
        }
        setItem(data);
      } catch (err) {
        console.error("Failed to fetch fresh item data", err);
      }
    }
    fetchFreshItem();
  }, [routeItemId, authData, refreshTrigger]);

  // 2. NextUp for Series
  useEffect(() => {
    if (item?.Type !== "Series" || !authData) {
      setNextUpLoaded(true);
      return;
    }
    async function fetchNextUp() {
      try {
        const res  = await fetch(`${authData.serverUrl}/Shows/NextUp?userId=${authData.userId}&seriesId=${item.Id}&api_key=${authData.token}`);
        const data = await res.json();
        if (data.Items?.length > 0) setNextUp(data.Items[0]);
        else setNextUp(null);
      } catch (err) {
        console.error("Failed to fetch NextUp", err);
      } finally {
        setNextUpLoaded(true);
      }
    }
    fetchNextUp();
  }, [item?.Id, authData, refreshTrigger]);

  // 3. Seasons
  useEffect(() => {
    if (item?.Type !== "Series" || !authData) return;
    async function fetchSeasons() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        const res = await itemsApi.getItems({
          userId: authData.userId,
          parentId: item.Id,
          includeItemTypes: ["Season"],
          sortBy: ["SortName"],
          fields: ["UserData"] as any,
        });
        if (res.data.Items?.length > 0) {
          setSeasons(res.data.Items);
        }
      } catch (err) {
        console.error("Failed to fetch seasons", err);
      }
    }
    fetchSeasons();
  }, [item?.Id, authData, refreshTrigger]);

  // Safely auto-select initial season ONLY ONCE
  useEffect(() => {
    if (nextUpLoaded && seasons.length > 0 && !selectedSeasonId) {
      if (nextUp?.SeasonId) {
        setSelectedSeasonId(nextUp.SeasonId);
      } else {
        setSelectedSeasonId(seasons[0].Id);
      }
    }
  }, [nextUpLoaded, seasons, nextUp, selectedSeasonId]);

  // 4. Episodes
  useEffect(() => {
    if (!selectedSeasonId || !authData) return;
    
    const isBackgroundSync = episodes.length > 0 && episodes[0]?.SeasonId === selectedSeasonId;
    if (!isBackgroundSync) setIsEpisodesLoading(true);

    async function fetchEpisodes() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        const res = await itemsApi.getItems({
          userId: authData.userId,
          parentId: selectedSeasonId,
          includeItemTypes: ["Episode"],
          fields: ["Overview", "CommunityRating", "UserData"] as any,
          sortBy: ["IndexNumber"],
          imageTypes: ["Primary"],
        });
        if (res.data.Items) setEpisodes(res.data.Items);
      } catch (err) {
        console.error("Failed to fetch episodes", err);
      } finally {
        setIsEpisodesLoading(false);
      }
    }
    fetchEpisodes();
  }, [selectedSeasonId, authData, refreshTrigger]);

  // 5. More Like This
  useEffect(() => {
    if (!item || !authData) return;
    async function fetchMoreLikeThis() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        const genreIds = item.GenreItems?.map((g: any) => g.Id) ?? [];
        const res = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: [item.Type === "Series" ? "Series" : "Movie"],
          recursive: true,
          sortBy: ["CommunityRating"],
          sortOrder: ["Descending"],
          limit: 20,
          genreIds: genreIds.length > 0 ? genreIds : undefined,
          fields: ["Overview", "CommunityRating", "Genres", "ImageTags", "BackdropImageTags"],
        });
        const filtered = (res.data.Items ?? []).filter((i: any) => i.Id !== item.Id);
        setMoreLikeThis(filtered.slice(0, 15));
      } catch (err) {
        console.error("Failed to fetch more like this", err);
      }
    }
    fetchMoreLikeThis();
  }, [item?.Id, authData]);

  // 6. AniList enrichment for anime series
  useEffect(() => {
    if (!item) return;
    const isAnime =
      item.Type === "Series" &&
      item.Genres?.some((g: string) => /anime/i.test(g));
    if (!isAnime) return;

    setAnilistLoading(true);
    fetchAniListCast(item.Name ?? "", item.OriginalTitle ?? "", item.ProductionYear)
      .then((cast) => setAnilistCast(cast))
      .finally(() => setAnilistLoading(false));
  }, [item?.Id]);

  // 7. Fetch trailer key — Jellyfin RemoteTrailers first, worker as fallback
  useEffect(() => {
    if (!item?.Id) return;
    setTrailerKey(null);
    setShowTrailer(false);

    async function fetchTrailer() {
      try {
        // ── Priority 1: Jellyfin RemoteTrailers (works for ALL types incl. anime)
        // Jellyfin stores YouTube trailer URLs directly on the item — same source the official client uses
        const remoteTrailers: any[] = item.RemoteTrailers ?? [];
        for (const t of remoteTrailers) {
          const url = t.Url ?? t.url ?? "";
          const ytMatch = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
          if (ytMatch) {
            setTrailerKey(ytMatch[1]);
            return;
          }
        }

        // ── Priority 2: Worker fallback (TMDB for movies/kdrama, Jikan for anime)
        const isAnime  = item.Genres?.some((g: string) => /anime/i.test(g));
        let endpoint = "";
        if (isAnime) {
          // Search → get MAL ID → fetch full detail (trailerUrl only in /api/anime/:id)
          const searchRes  = await fetch(`${API}/api/anime/search?q=${encodeURIComponent(item.Name)}`);
          const searchData = await searchRes.json();
          const match = searchData?.data?.[0];
          if (!match?.malId) return;
          const detailRes  = await fetch(`${API}/api/anime/${match.malId}`);
          const detailData = await detailRes.json();
          const trailerUrl = detailData?.data?.trailerUrl;
          if (trailerUrl) {
            const ytMatch = trailerUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
            if (ytMatch) setTrailerKey(ytMatch[1]);
          }
          return;
        } else if (item.Type === "Series") {
          const tmdbId = item.ProviderIds?.Tmdb;
          if (tmdbId) endpoint = `${API}/api/kdrama/${tmdbId}`;
        } else {
          const tmdbId = item.ProviderIds?.Tmdb;
          if (tmdbId) endpoint = `${API}/api/movies/${tmdbId}`;
        }

        if (!endpoint) return;
        const res  = await fetch(endpoint);
        const data = await res.json();
        if (data?.data?.trailer?.key) setTrailerKey(data.data.trailer.key);
      } catch { /* non-fatal */ }
    }
    fetchTrailer();
    // CHANGED: Added item?.ProviderIds?.Tmdb and item?.Genres to dependencies 
    // so this runs again immediately once the fresh fetch completes!
  }, [item?.Id, item?.ProviderIds?.Tmdb, item?.Genres, item?.RemoteTrailers]);

  // Auto-show trailer after 6s if we have a key, reset on item change
  useEffect(() => {
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    if (trailerIntervalRef.current) clearInterval(trailerIntervalRef.current);
    setShowTrailer(false);
    setTrailerCountdown(0);
    setIsMuted(true);
    if (!trailerKey) return;

    const DURATION = 6000;
    const STEP = 50;
    let elapsed = 0;
    trailerIntervalRef.current = setInterval(() => {
      elapsed += STEP;
      setTrailerCountdown(Math.min(100, (elapsed / DURATION) * 100));
    }, STEP);

    trailerTimerRef.current = setTimeout(() => {
      setShowTrailer(true);
      if (trailerIntervalRef.current) clearInterval(trailerIntervalRef.current);
    }, DURATION);

    return () => {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      if (trailerIntervalRef.current) clearInterval(trailerIntervalRef.current);
    };
  }, [trailerKey, item?.Id]);

  const cancelTrailerCountdown = () => {
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    if (trailerIntervalRef.current) clearInterval(trailerIntervalRef.current);
    setTrailerCountdown(0);
  };

  // ─── Action Handlers ─────────────────────
  
  // Handlers for specific episodes or seasons
  const handleToggleWatched = async (e: React.MouseEvent, itemId: string, currentlyWatched: boolean, type: "Episode" | "Season") => {
    e.stopPropagation();
    e.preventDefault();
    
    if (type === "Episode") {
      setEpisodes(prev => prev.map(ep => ep.Id === itemId ? { 
        ...ep, UserData: { ...(ep.UserData || {}), Played: !currentlyWatched, PlaybackPositionTicks: currentlyWatched ? ep.UserData?.PlaybackPositionTicks : 0 } 
      } : ep));
    } else {
      setSeasons(prev => prev.map(s => s.Id === itemId ? { 
        ...s, UserData: { ...(s.UserData || {}), Played: !currentlyWatched } 
      } : s));

      if (itemId === selectedSeasonId) {
        setEpisodes(prev => prev.map(ep => ({
          ...ep, UserData: { ...(ep.UserData || {}), Played: !currentlyWatched, PlaybackPositionTicks: 0 }
        })));
      }
    }

    try {
      if (currentlyWatched) {
        await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${itemId}?api_key=${authData.token}`, { method: "DELETE" });
      } else {
        await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${itemId}?api_key=${authData.token}`, { method: "POST" });
      }
    } catch (err) {
      console.error("Failed to toggle watched status", err);
    } finally {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Handler for the Main Movie or Main Show (Hero Section)
  const handleToggleMainItemWatched = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const currentlyWatched = item.UserData?.Played;
    
    // Optimistic UI update for the main item
    setItem((prev: any) => ({
      ...prev,
      UserData: { 
        ...(prev.UserData || {}), 
        Played: !currentlyWatched, 
        PlaybackPositionTicks: currentlyWatched ? prev.UserData?.PlaybackPositionTicks : 0 
      }
    }));

    try {
      if (currentlyWatched) {
        await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${item.Id}?api_key=${authData.token}`, { method: "DELETE" });
      } else {
        await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${item.Id}?api_key=${authData.token}`, { method: "POST" });
      }
    } catch (err) {
      console.error("Failed to toggle main item watched status", err);
    } finally {
      // Force refresh to update episodes/seasons checks as well if it's a TV show!
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleRemoveProgress = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    e.preventDefault();

    setEpisodes(prev => prev.map(ep => ep.Id === itemId ? { 
      ...ep, UserData: { ...(ep.UserData || {}), PlaybackPositionTicks: 0 } 
    } : ep));
    
    try {
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayingItems/${itemId}?api_key=${authData.token}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to remove item progress", err);
    } finally {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleHeroPlay = () => {
    if (item.Type === "Series") {
      if (nextUp) {
        navigate(`/play/${nextUp.Id}`, { state: { item: nextUp } });
      } else if (episodes.length > 0) {
        navigate(`/play/${episodes[0].Id}`, { state: { item: episodes[0] } });
      }
    } else {
      navigate(`/play/${item.Id}`, { state: { item } });
    }
  };

  if (!item) return null;

  let playBtnText = "Play";
  if (item.Type === "Series" && nextUp) {
    playBtnText = nextUp.UserData?.PlaybackPositionTicks > 0
      ? `Resume S${nextUp.ParentIndexNumber} E${nextUp.IndexNumber}`
      : `Play S${nextUp.ParentIndexNumber} E${nextUp.IndexNumber}`;
  } else if (item.Type === "Movie" && item.UserData?.PlaybackPositionTicks > 0) {
    playBtnText = "Resume";
  }

  const runtime = item.RunTimeTicks
    ? (() => {
        const m = Math.round(item.RunTimeTicks / 600_000_000);
        return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
      })()
    : null;

  // Combine roles if a person did multiple things
  const peopleToDisplay = item.People ? item.People.reduce((acc: any[], current: any) => {
    const existing = acc.find((p: any) => p.Id === current.Id);
    if (existing) {
      if (current.Type && !existing.allTypes.includes(current.Type)) existing.allTypes.push(current.Type);
      if (current.Role && !existing.allRoles.includes(current.Role)) existing.allRoles.push(current.Role);
    } else {
      acc.push({
        ...current,
        allTypes: current.Type ? [current.Type] : [],
        allRoles: current.Role ? [current.Role] : []
      });
    }
    return acc;
  }, []) : [];

  return (
    <div className="min-h-screen bg-[#141414] text-white overflow-y-auto animate-[fadeIn_0.35s_ease-out]">

      {/* ── Floating header ─────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 pt-5 pb-10 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex items-center gap-2 text-sm font-semibold text-white/80
            hover:text-white bg-black/50 hover:bg-black/80 px-4 py-2 rounded-full
            border border-white/10 hover:border-white/30 transition-all backdrop-blur-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <img 
          src={logo} 
          alt="Parallax TV" 
          className="h-6 w-auto drop-shadow-md pointer-events-none" 
        />
      </div>

      {/* ── Hero backdrop + trailer ──────────────────────────────────────────── */}
      <div className="w-full h-[78vh] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-black/20 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/30 to-transparent z-10 pointer-events-none" />

        {/* Backdrop image — fades out when trailer plays */}
        <img
          src={`${authData.serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=1920&quality=92&api_key=${authData.token}`}
          alt={item.Name}
          className="w-full h-full object-cover object-top absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: showTrailer ? 0 : 1 }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = "none";
          }}
        />

        {/* YouTube trailer iframe — fades in when ready, oversized + centered to cover the hero without black bars */}
        {trailerKey && (
          <div
            className="absolute inset-0 overflow-hidden transition-opacity duration-1000 pointer-events-none"
            style={{ opacity: showTrailer ? 1 : 0 }}
          >
            <iframe
              key={`${trailerKey}-${isMuted}`}
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
              allow="autoplay; encrypted-media"
              className="absolute top-1/2 left-1/2 pointer-events-none"
              style={{
                border: "none",
                width: "177.78vh",   // 16:9 based on height
                height: "100vh",
                minWidth: "100%",
                minHeight: "56.25vw", // 16:9 based on width
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        )}

        {/* Trailer controls — shown when trailer is active */}
        {showTrailer && trailerKey && (
          <div className="absolute top-20 right-6 z-30 flex items-center gap-2"
            style={{ animation: "fadeIn 0.4s ease-out" }}>
            {/* Mute / Unmute toggle */}
            <button
              onClick={() => setIsMuted(v => !v)}
              className="flex items-center gap-1.5 bg-black/70 hover:bg-black border border-white/20 hover:border-white/40 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-all"
            >
              {isMuted ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M10.5 6.75v10.5L6 14.25H3.75A.75.75 0 013 13.5v-3a.75.75 0 01.75-.75H6l4.5-3.75z" />
                  </svg>
                  Unmute
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                  Mute
                </>
              )}
            </button>
            <button
              onClick={() => { setShowTrailer(false); cancelTrailerCountdown(); }}
              className="flex items-center gap-1.5 bg-black/70 hover:bg-black border border-white/20 hover:border-white/40 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Hide Trailer
            </button>
          </div>
        )}

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 z-20 px-12 pb-12 max-w-2xl"
          style={{ animation: "fadeSlideUp 0.5s ease-out both" }}>

          {item.ImageTags?.Logo ? (
            <img
              src={`${authData.serverUrl}/Items/${item.Id}/Images/Logo?fillWidth=500&quality=96&api_key=${authData.token}`}
              alt={item.Name}
              className="mb-5 w-auto max-w-sm max-h-32 object-contain drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <h1 className="text-5xl font-black text-white mb-5 drop-shadow-lg leading-tight tracking-tight">
              {item.Name}
            </h1>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <StarRating rating={item.CommunityRating} voteCount={item.VoteCount} />
            {item.OfficialRating && (
              <span className="border border-gray-500/70 text-gray-300 px-2 py-0.5 rounded text-[11px] font-mono tracking-wider">
                {item.OfficialRating}
              </span>
            )}
            {item.ProductionYear && (
              <span className="text-gray-300 text-sm">{item.ProductionYear}</span>
            )}
            {runtime && (
              <span className="text-gray-400 text-sm">{runtime}</span>
            )}
            <span className="bg-white/10 text-white/60 text-[11px] px-2.5 py-0.5 rounded-full font-semibold tracking-wider uppercase">
              {item.Type === "Series" ? "TV Show" : "Movie"}
            </span>
          </div>

          {/* Genre pills */}
          {item.Genres?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {item.Genres.slice(0, 4).map((g: string) => (
                <span key={g} className="text-[11px] text-gray-400 px-3 py-0.5 rounded-full border border-white/10 bg-white/5">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center gap-3">
            <PlayButton large onClick={handleHeroPlay}>{playBtnText}</PlayButton>
            <GhostButton large>My List</GhostButton>

            {/* Trailer button — wrapper div isolates the countdown ring from sibling buttons */}
            {trailerKey && !showTrailer && (
              <div className="relative flex-shrink-0 w-12 h-12 group">
                {/* Ring lives in the wrapper, NOT inside the button — so it can never bleed onto siblings */}
                {trailerCountdown > 0 && trailerCountdown < 100 && (
                  <svg
                    className="absolute inset-0 w-12 h-12 -rotate-90 pointer-events-none"
                    viewBox="0 0 48 48"
                    style={{ zIndex: 1 }}
                  >
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none"
                      stroke="#e50914"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - trailerCountdown / 100)}`}
                      style={{ transition: "stroke-dashoffset 0.05s linear" }}
                    />
                  </svg>
                )}
                <button
                  onClick={() => {
                    if (trailerCountdown > 0 && trailerCountdown < 100) {
                      cancelTrailerCountdown();
                    } else {
                      setShowTrailer(true);
                      cancelTrailerCountdown();
                    }
                  }}
                  className="absolute inset-0 flex items-center justify-center w-12 h-12 rounded-full
                    bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40
                    backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
                  style={{ zIndex: 2 }}
                  aria-label="Play trailer"
                >
                  {/* Icon: camera (default) or X on hover mid-countdown */}
                  {trailerCountdown > 0 && trailerCountdown < 100 ? (
                    <>
                      <svg className="w-4 h-4 text-white group-hover:opacity-0 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      <svg className="w-4 h-4 text-white absolute opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}

                  <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider whitespace-nowrap pointer-events-none">
                    {trailerCountdown > 0 && trailerCountdown < 100 ? "Cancel auto-play" : "Play Trailer"}
                  </span>
                </button>
              </div>
            )}

            {/* Mark Watched Toggle */}
            <button
              onClick={handleToggleMainItemWatched}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300 backdrop-blur-sm shadow-lg hover:scale-105
                ${item.UserData?.Played
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  : "bg-black/40 text-white/80 border-white/30 hover:bg-black/70 hover:text-white hover:border-white/60"
                }`}
            >
              {item.UserData?.Played ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              )}
              <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider whitespace-nowrap pointer-events-none">
                {item.UserData?.Played ? "Mark Unwatched" : "Mark Watched"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="px-12 pb-24 -mt-2 relative z-20">

        <ExpandableOverview overview={item.Overview} />

        {/* ── Season poster cards ──────────────────────────────────────────── */}
        {item.Type === "Series" && seasons.length > 0 && (
          <div className="mb-8" style={{ animation: "fadeSlideUp 0.5s 0.15s ease-out both" }}>
            <SectionHeader>Seasons</SectionHeader>
            <ArrowRow itemWidth={150} gap={18} paddingLeft={8}>
              {seasons.map((season) => {
                const isSelected = season.Id === selectedSeasonId;
                const isSeasonPlayed = season.UserData?.Played;

                return (
                  <div
                    key={season.Id}
                    onClick={() => setSelectedSeasonId(season.Id)}
                    className="flex-shrink-0 w-[150px] cursor-pointer group/season relative"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className={`rounded-xl overflow-hidden transition-all duration-300
                      ${isSelected
                        ? "scale-[1.06] shadow-[0_8px_32px_rgba(0,0,0,0.7)] ring-2 ring-red-600"
                        : "scale-100 hover:scale-[1.03] opacity-50 hover:opacity-80 ring-1 ring-white/5"
                      }`}
                    >
                      <img
                        src={`${authData.serverUrl}/Items/${season.Id}/Images/Primary?fillHeight=340&fillWidth=220&quality=94&api_key=${authData.token}`}
                        alt={season.Name}
                        className="w-full h-[220px] object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `${authData.serverUrl}/Items/${item.Id}/Images/Primary?fillHeight=340&fillWidth=220&quality=94&api_key=${authData.token}`;
                        }}
                      />

                      {isSeasonPlayed && (
                        <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 backdrop-blur-sm z-10 group-hover/season:opacity-0 transition-opacity duration-200">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      <div className="absolute inset-0 opacity-0 group-hover/season:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-start p-2 pointer-events-none">
                        <div className="flex justify-end pointer-events-auto">
                          <button onClick={(e) => handleToggleWatched(e, season.Id, isSeasonPlayed, "Season")} className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110">
                            {isSeasonPlayed ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Clean red underline for selected */}
                    <div className={`mt-2.5 mx-auto transition-all duration-300 ${isSelected ? "w-8 h-0.5 bg-red-600 rounded-full" : "w-0 h-0.5"}`} />

                    <p className={`mt-1.5 text-center text-xs font-semibold truncate px-1 transition-colors duration-300 ${isSelected ? "text-white" : "text-gray-600 group-hover/season:text-gray-400"}`}>
                      {season.Name}
                    </p>
                  </div>
                );
              })}
            </ArrowRow>
          </div>
        )}

        {/* ── Episodes ─────────────────────────────────────────────────────── */}
        {item.Type === "Series" && selectedSeasonId && (
          <div className="mb-14" style={{ animation: "fadeSlideUp 0.5s 0.2s ease-out both" }}>
            <SectionHeader>Episodes</SectionHeader>

            {isEpisodesLoading ? (
              <div className="flex gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[300px]">
                    <div className="w-full aspect-video rounded-xl bg-white/5 animate-pulse mb-3" />
                    <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
                    <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : episodes.length === 0 ? (
              <p className="text-gray-600 py-8">No episodes found.</p>
            ) : (
              <ArrowRow itemWidth={300} gap={16}>
                {episodes.map((ep) => {
                  const isPlayed    = ep.UserData?.Played;
                  const progressPct = ep.UserData?.PlaybackPositionTicks && ep.RunTimeTicks ? (ep.UserData.PlaybackPositionTicks / ep.RunTimeTicks) * 100 : 0;
                  const epRuntime = ep.RunTimeTicks ? Math.round(ep.RunTimeTicks / 600_000_000) : null;
                  const isNextUp = nextUp?.Id === ep.Id;

                  return (
                    <div key={ep.Id} className="flex-shrink-0 w-[300px] group cursor-pointer" style={{ scrollSnapAlign: "start" }} onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}>
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1e1e1e] mb-3 shadow-lg">
                        <img
                          src={`${authData.serverUrl}/Items/${ep.Id}/Images/Primary?fillWidth=600&quality=90&api_key=${authData.token}`}
                          alt={ep.Name}
                          className={`w-full h-full object-cover transition duration-300 group-hover:scale-105 ${isPlayed ? "brightness-50" : "group-hover:brightness-75"}`}
                          onError={(e) => { 
                            e.currentTarget.onerror = null; 
                            e.currentTarget.src = `${authData.serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=600&quality=90&api_key=${authData.token}`; 
                          }}
                        />

                        {isNextUp && (
                          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider z-10">Up Next</div>
                        )}

                        {isPlayed && (
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 backdrop-blur-sm z-10 group-hover:opacity-0 transition-opacity duration-200">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}

                        {!isPlayed && progressPct > 0 && (
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/60 z-10">
                            <div className="h-full bg-red-600 transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                        )}

                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-between p-2.5 pointer-events-none">
                          <div className="flex justify-end gap-2 pointer-events-auto">
                            <button onClick={(e) => handleToggleWatched(e, ep.Id, isPlayed, "Episode")} className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110">
                              {isPlayed ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>

                            {!isPlayed && progressPct > 0 && (
                              <button onClick={(e) => handleRemoveProgress(e, ep.Id)} className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/play/${ep.Id}`, { state: { item: ep } }); }} className="w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-2xl drop-shadow-2xl pointer-events-auto transition-transform hover:scale-110" title="Play">
                              <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start justify-between mb-1 px-0.5">
                        <h4 className={`font-semibold text-sm truncate pr-2 flex-1 leading-snug ${isPlayed ? "text-gray-500" : "text-white"}`}>
                          <span className="text-gray-600 mr-1.5 font-normal">{ep.IndexNumber}.</span>
                          {ep.Name}
                        </h4>
                        {epRuntime && <span className="text-xs text-gray-600 flex-shrink-0">{epRuntime}m</span>}
                      </div>
                      <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed px-0.5">{ep.Overview || "No description available."}</p>
                    </div>
                  );
                })}
              </ArrowRow>
            )}
          </div>
        )}

        {/* ── Cast & Crew ───────────────────────────────────────────────────── */}
        {(anilistCast !== null || peopleToDisplay.length > 0) && (
          <div className="mb-10" style={{ animation: "fadeSlideUp 0.5s 0.25s ease-out both" }}>
            <SectionHeader>
              {anilistCast !== null ? (
                <span className="flex items-center gap-2">
                  Cast & Crew
                  <span className="text-[9px] font-bold uppercase tracking-widest text-red-500 bg-red-600/10 border border-red-600/30 px-1.5 py-0.5 rounded">
                    MAL
                  </span>
                </span>
              ) : "Cast & Crew"}
            </SectionHeader>

            {/* ── AniList cast: char + VA stacked portrait style ── */}
            {anilistCast !== null ? (
              anilistLoading ? (
                <div className="flex gap-5">
                  {[...Array(6)].map((_,i) => (
                    <div key={i} className="w-[110px] flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
                      <div className="w-14 h-2 rounded bg-white/5 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <ArrowRow itemWidth={110} gap={20}>
                  {anilistCast.map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center w-[110px] flex-shrink-0 group"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      {/* Stacked: VA behind, character in front */}
                      <div className="relative w-20 h-20 mb-2.5">
                        <img
                          src={c.actorImage || SAFE_PLACEHOLDER}
                          className="absolute inset-0 w-full h-full rounded-full object-cover brightness-50 ring-2 ring-transparent group-hover:ring-white/20 transition-all duration-300"
                          title={`VA: ${c.actorName}`}
                          onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                        />
                        <img
                          src={c.charImage || SAFE_PLACEHOLDER}
                          className="absolute bottom-0 right-0 w-[46px] h-[46px] rounded-full object-cover border-2 border-[#141414] shadow-xl z-10 group-hover:scale-110 transition-transform duration-300"
                          title={c.charName}
                          onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-white text-center w-full truncate leading-snug group-hover:text-red-400 transition-colors">
                        {c.charName}
                      </span>
                      <span className="text-[10px] text-gray-500 text-center w-full truncate mt-0.5">
                        {c.actorName}
                      </span>
                    </div>
                  ))}
                </ArrowRow>
              )
            ) : (
              /* ── Standard Jellyfin cast ── */
              <ArrowRow itemWidth={110} gap={20}>
                {peopleToDisplay.map((person: any, idx: number) => {
                  const typesStr = person.allTypes
                    .map((t: string) => t.replace(/([A-Z])/g, ' $1').trim())
                    .join(" • ");
                  const rolesStr = person.allRoles.join(" / ");
                  const isActorOrGuest = person.allTypes.includes("Actor") || person.allTypes.includes("GuestStar") || person.allTypes.includes("VoiceActor");

                  return (
                    <div
                      key={`${person.Id}-${idx}`}
                      className="flex flex-col items-center w-[110px] flex-shrink-0 group cursor-pointer"
                      style={{ scrollSnapAlign: "start" }}
                      onClick={() => navigate(`/person/${person.Id}`, { state: { person } })}
                    >
                      <div className="relative w-20 h-20 rounded-full overflow-hidden mb-2.5 ring-2 ring-transparent group-hover:ring-white/40 transition-all duration-300 shadow-lg">
                        <img
                          src={
                            person.PrimaryImageTag || person.ImageTags?.Primary
                              ? `${authData.serverUrl}/Items/${person.Id}/Images/Primary?fillHeight=200&fillWidth=200&quality=90&api_key=${authData.token}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(person.Name)}&background=2a2a2a&color=666&size=200`
                          }
                          alt={person.Name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.Name)}&background=2a2a2a&color=666&size=200`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-white text-center w-full truncate leading-snug group-hover:text-red-400 transition-colors">
                        {person.Name}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium text-center w-full truncate mt-0.5">
                        {typesStr}
                      </span>
                      {rolesStr && (
                        <span className="text-[10px] text-gray-600 text-center w-full truncate mt-0.5">
                          {isActorOrGuest ? `as ${rolesStr}` : rolesStr}
                        </span>
                      )}
                    </div>
                  );
                })}
              </ArrowRow>
            )}
          </div>
        )}
      </div>

        {/* ── More Like This ──────────────────────────────────────────────── */}
        {moreLikeThis.length > 0 && (
          <div className="mb-14" style={{ animation: "fadeSlideUp 0.5s 0.3s ease-out both" }}>
            <SectionHeader>More Like This</SectionHeader>
            <ArrowRow itemWidth={160} gap={16} paddingLeft={8}>
              {moreLikeThis.map((related) => {
                return (
                  <div
                    key={related.Id}
                    className="flex-shrink-0 w-[160px] cursor-pointer group/related"
                    style={{ scrollSnapAlign: "start" }}
                    onClick={() => navigate(`/title/${related.Id}`, { state: { item: related } })}
                  >
                    <div className="relative rounded-xl overflow-hidden mb-2.5 shadow-lg
                      transition-all duration-300 group-hover/related:scale-[1.04] group-hover/related:shadow-2xl">
                      <img
                        src={`${authData.serverUrl}/Items/${related.Id}/Images/Primary?fillHeight=360&fillWidth=240&quality=92&api_key=${authData.token}`}
                        alt={related.Name}
                        className="w-full h-[240px] object-cover transition-all duration-300
                          group-hover/related:brightness-75"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SAFE_PLACEHOLDER; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/related:opacity-100 transition-opacity duration-200">
                        <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                          <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                      {related.CommunityRating && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          <span className="text-[10px] font-bold text-white">{related.CommunityRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-300 truncate px-0.5 group-hover/related:text-white transition-colors leading-snug">
                      {related.Name}
                    </p>
                    {related.ProductionYear && (
                      <p className="text-[11px] text-gray-600 px-0.5 mt-0.5">{related.ProductionYear}</p>
                    )}
                  </div>
                );
              })}
            </ArrowRow>
          </div>
        )}

      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
