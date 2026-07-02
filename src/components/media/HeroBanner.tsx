import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { PlayButton, GhostButton } from "../ui/Buttons";
import { FavoriteButton } from "../ui/FavoriteButton";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { AuthData } from "../../types/auth";
import { useSettings } from "../../store/settings";

const OCEAN = "#38bdf8";
const GOLD = "#FBBF24";  
const SLIDE_INTERVAL = 8000;

function formatRuntime(ticks: number | undefined): string {
  if (!ticks) return "";
  const totalMinutes = Math.floor(ticks / 600_000_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getImageUrl(serverUrl: string, token: string, itemId: string, type: "Backdrop" | "Logo", width = 1920) {
  return `${serverUrl}/Items/${itemId}/Images/${type}?fillWidth=${width}&quality=95&api_key=${token}`;
}

function getContentType(item: any): "movies" | "shows" | "anime" {
  const genres = (item.Genres || []).map((g: string) => g.toLowerCase());
  const isAnime = genres.includes("anime") || genres.includes("animation");
  if (isAnime) return "anime";
  return item.Type === "Series" ? "shows" : "movies";
}

function isWithinTimeRange(item: any, range: "all" | "month" | "6months" | "year"): boolean {
  if (range === "all") return true;

  const releaseDate = item.PremiereDate
    ? new Date(item.PremiereDate)
    : item.ProductionYear
      ? new Date(item.ProductionYear, 0, 1)
      : null;

  if (!releaseDate) return false;
  const now = new Date();

  if (range === "month") {
    return releaseDate.getFullYear() === now.getFullYear() && releaseDate.getMonth() === now.getMonth();
  }
  if (range === "year") {
    const cutoff = now.getTime() - 365 * 24 * 60 * 60 * 1000;
    return releaseDate.getTime() >= cutoff;
  }
  const cutoff = now.getTime() - 182 * 24 * 60 * 60 * 1000;
  return releaseDate.getTime() >= cutoff;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating / 2); 
  return (
    <div className="flex items-center gap-1.5 w-fit">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24"
            fill={i < filled ? GOLD : "none"} 
            stroke={i < filled ? GOLD : "rgba(255,255,255,0.25)"} 
            strokeWidth={1.5}
            style={{ filter: i < filled ? `drop-shadow(0 0 6px rgba(251,191,36,0.6))` : "none" }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className="text-[14px] font-bold ml-1" style={{ color: GOLD }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function SlideIndicator({ count, current, onSelect }: { count: number; current: number; onSelect: (i: number) => void; }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="relative h-[3px] rounded-full overflow-hidden transition-all duration-500 ease-out cursor-pointer"
          style={{ width: i === current ? 32 : 12, background: i === current ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)" }}>
          {i === current && (
            <span className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: OCEAN, animation: `heroProgress ${SLIDE_INTERVAL}ms linear forwards` }} />
          )}
        </button>
      ))}
      <style>{`@keyframes heroProgress { from { width: 0%; } to { width: 100%; } }`}</style>
    </div>
  );
}

export function HeroBanner({ authData }: { authData: AuthData }) {
  const navigate = useNavigate();
  const { heroMinRating, heroContentTypes, heroLibraryIds, heroUseFallbackLibraries, heroOnlyTrending, heroTimeRange } = useSettings();
  const [heroItems, setHeroItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());
  
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authData) return;
    
    const hasContentTypes = heroContentTypes.length > 0;
    const hasFallbackLibraries = (heroLibraryIds || []).length > 0;

    // If user has disabled everything, or the selected mode has no active source, return early
    if ((!heroUseFallbackLibraries && !hasContentTypes) || (heroUseFallbackLibraries && !hasFallbackLibraries)) {
      setHeroItems([]);
      return;
    }
    
    let isMounted = true; 

    async function fetchHero() {
      try {
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const selectedLibraryIds = (heroLibraryIds || []).filter(Boolean);

        const itemRequests = heroUseFallbackLibraries && selectedLibraryIds.length > 0
          ? selectedLibraryIds.map((libraryId) =>
              getItemsApi(api).getItems({
                userId: authData.userId,
                parentId: libraryId,
                includeItemTypes: ["Movie", "Series"],
                recursive: true,
                sortBy: ["DateCreated"],
                sortOrder: [SortOrder.Descending],
                limit: 120,
                fields: [
                  "Overview", "CommunityRating", "Genres", "RunTimeTicks", "OfficialRating",
                  "BackdropImageTags", "ImageTags", "ImageBlurHashes", "UserData", "PremiereDate", "ParentId"
                ] as any,
              })
            )
          : [
              getItemsApi(api).getItems({
                userId: authData.userId,
                includeItemTypes: ["Movie", "Series"],
                recursive: true,
                sortBy: ["DateCreated"],
                sortOrder: [SortOrder.Descending],
                limit: 240,
                fields: [
                  "Overview", "CommunityRating", "Genres", "RunTimeTicks", "OfficialRating",
                  "BackdropImageTags", "ImageTags", "ImageBlurHashes", "UserData", "PremiereDate", "ParentId"
                ] as any,
              })
            ];

        const responses = await Promise.all(itemRequests);

        if (!isMounted) return;

        const allItems = responses.flatMap((response, index) =>
          (response.data.Items ?? []).map((item: any) => ({
            ...item,
            sourceLibraryId: heroUseFallbackLibraries && selectedLibraryIds.length > 0 ? selectedLibraryIds[index] : undefined,
          }))
        );

        const validItems = allItems.filter((i: any) => {
          if (!i.BackdropImageTags?.length) return false;

          const matchesType = !heroUseFallbackLibraries && heroContentTypes.includes(getContentType(i));
          const matchesLibrary = heroUseFallbackLibraries && Boolean(i.sourceLibraryId);

          if (!matchesType && !matchesLibrary) return false;

          if (heroMinRating > 0 && (i.CommunityRating ?? 0) < heroMinRating) return false;
          if (!isWithinTimeRange(i, heroTimeRange)) return false;

          return true;
        });

        const rawTrending = validItems.filter((i: any) => i.CommunityRating && i.CommunityRating >= 8.0);
        const newPool = heroOnlyTrending ? [] : validItems.filter((i: any) => !i.CommunityRating || i.CommunityRating < 8.0);

        rawTrending.sort((a, b) => (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0));
        const rankedTrending = rawTrending.map((item, index) => ({
          ...item,
          isTrending: true,
          trendingRank: index + 1
        }));

        const shuffledTrending = shuffleArray(rankedTrending.slice(0, heroOnlyTrending ? 15 : 10));
        const shuffledNew = shuffleArray(newPool);

        const combined = heroOnlyTrending
          ? shuffledTrending
          : [...shuffledTrending.slice(0, 7), ...shuffledNew.slice(0, 8)];
        setHeroItems(combined.slice(0, 15));
      } catch (err) {
        if (isMounted) console.error(err);
      }
    }
    fetchHero();

    return () => { isMounted = false; };
  }, [authData, heroMinRating, heroContentTypes, heroLibraryIds, heroUseFallbackLibraries, heroOnlyTrending, heroTimeRange]);

  const startTimer = useCallback(() => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    slideTimerRef.current = setInterval(() => {
      setIsTransitioning(true);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % heroItems.length);
        setIsTransitioning(false);
      }, 400);
    }, SLIDE_INTERVAL);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    startTimer();
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [heroItems.length, startTimer]);

  const goTo = (idx: number) => {
    if (idx === currentIndex) return;
    startTimer(); 
    setIsTransitioning(true);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(idx);
      setIsTransitioning(false);
    }, 400);
  };

  const hasContentTypes = heroContentTypes.length > 0;
  const hasFallbackLibraries = (heroLibraryIds || []).length > 0;

  if ((!heroUseFallbackLibraries && !hasContentTypes) || (heroUseFallbackLibraries && !hasFallbackLibraries)) {
    return (
      <div className="w-full aspect-[21/9] min-h-[600px] rounded-[1.5rem] bg-[#05050A] flex flex-col items-center justify-center border border-white/5 shadow-2xl">
        <svg className="w-12 h-12 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <p className="text-white/50 text-sm font-medium">Select content types or enable fallback libraries in settings</p>
      </div>
    );
  }

  if (heroItems.length === 0) {
    return <div className="w-full aspect-[21/9] min-h-[600px] rounded-[1.5rem] bg-black/40 animate-pulse overflow-hidden relative border border-white/5" />;
  }

  const current = heroItems[currentIndex];
  const runtime = formatRuntime(current.RunTimeTicks);
  const rating = current.CommunityRating ? current.CommunityRating as number : null;
  const logoUrl = getImageUrl(authData.serverUrl, authData.token, current.Id, "Logo", 800);
  const showLogo = !!(current.ImageTags?.Logo || current.BackdropImageTags?.Logo || current.ImageBlurHashes?.Logo) && !logoErrors.has(current.Id);

  const typeLabel = current.Type === "Series" ? "TV Series" : "Movie";
  const metaParts = [
    current.ProductionYear ? String(current.ProductionYear) : null,
    runtime || null,
    current.OfficialRating || null,
    typeLabel,
  ].filter(Boolean) as string[];

  return (
    <div className="relative w-full aspect-[21/9] min-h-[600px] max-h-[75vh] rounded-[1.5rem] overflow-hidden bg-[#05050A] shadow-2xl group">
      <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/40 to-black/20 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05050A]/95 via-[#05050A]/40 to-transparent z-10 pointer-events-none" />

      {heroItems.map((item, idx) => (
        <img
          key={item.Id}
          src={getImageUrl(authData.serverUrl, authData.token, item.Id, "Backdrop")}
          alt={item.Name}
          className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out"
          style={{ opacity: idx === currentIndex ? 1 : 0, zIndex: idx === currentIndex ? 1 : 0 }}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }}
        />
      ))}

      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-10 md:px-14 pb-12 pt-8 max-w-4xl"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? "translateY(15px)" : "translateY(0)",
          transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
        }}
      >
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {current.isTrending ? (
            <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-xl shadow-lg border backdrop-blur-md"
                  style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <span className="text-red-500 text-sm">🔥</span>
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                #{current.trendingRank} Trending This Week
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-xl shadow-lg border backdrop-blur-md"
                  style={{ background: `${OCEAN}15`, borderColor: `${OCEAN}30` }}>
              <span style={{ color: OCEAN }}>NEW RELEASE</span>
            </span>
          )}
        </div>

        {showLogo ? (
          <img
            src={logoUrl}
            alt={current.Name}
            className="mb-8 w-auto max-w-[460px] max-h-[160px] object-contain object-left drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]"
            style={{ animation: "logoFloat 12s ease-in-out infinite" }}
            onError={() => setLogoErrors((prev) => new Set(prev).add(current.Id))}
          />
        ) : (
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 drop-shadow-2xl leading-tight tracking-tight"
              style={{ animation: "logoFloat 12s ease-in-out infinite" }}>
            {current.Name}
          </h1>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-5 text-[14px] text-gray-400 font-medium tracking-wide drop-shadow-md">
          {rating && (
            <>
              <div className="flex items-center gap-1.5 font-bold text-[15px]">
                <StarRating rating={rating} />
              </div>
              {metaParts.length > 0 && <span className="text-white/20">|</span>}
            </>
          )}
          {metaParts.map((part, i) => (
            <React.Fragment key={part + i}>
              {i > 0 && <span className="text-white/20">|</span>}
              <span className="text-gray-300">{part}</span>
            </React.Fragment>
          ))}
        </div>

        {current.Genres?.length > 0 && (
          <p className="text-[13px] text-gray-500 tracking-wider mb-6 uppercase font-semibold">
            {current.Genres.slice(0, 4).join("   ·   ")}
          </p>
        )}
        
        <p className="text-gray-300/80 text-[15px] leading-relaxed line-clamp-2 max-w-xl font-light mb-8 drop-shadow-md">
          {current.Overview}
        </p>

        <div className="flex items-center gap-4 mt-8 mb-6">
          <PlayButton large onClick={() => navigate(`/title/${current.Id}`, { state: { item: current } })} />
          <GhostButton large onClick={() => navigate(`/title/${current.Id}`, { state: { item: current } })}>
            More Info
          </GhostButton>

          <FavoriteButton
            itemId={current.Id}
            isFavorite={current.UserData?.IsFavorite || false}
            authData={authData}
            variant="hero"
          />
        </div>

        <div className="mt-6 pl-2">
          <SlideIndicator count={heroItems.length} current={currentIndex} onSelect={goTo} />
        </div>
      </div>

      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}