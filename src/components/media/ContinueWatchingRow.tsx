import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";

const SAFE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

interface ContinueWatchingRowProps {
  authData: AuthData;
  refreshKey?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export function ContinueWatchingRow({ authData, refreshKey, onLoadingChange }: ContinueWatchingRowProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Note: Keeping all your existing robust data fetching logic exactly the same
  useEffect(() => {
    if (!authData) return;
    if (onLoadingChange) onLoadingChange(true);
    setLoading(true);

    async function load() {
      try {
        let items: any[] = [];
        const resumeRes = await fetch(
          `${authData.serverUrl}/Users/${authData.userId}/Items/Resume?Recursive=true&MediaTypes=Video&Limit=50&Fields=UserData,RunTimeTicks,SeriesId,SeriesName,ParentIndexNumber,IndexNumber,Overview,ProductionYear&EnableImages=true&api_key=${authData.token}`
        );
        if (resumeRes.ok) items = (await resumeRes.json()).Items ?? [];

        if (items.length === 0) {
          const fallbackRes = await fetch(
            `${authData.serverUrl}/Users/${authData.userId}/Items?Filters=IsResumable&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&IncludeItemTypes=Movie,Episode&Limit=50&Fields=UserData,RunTimeTicks,SeriesId,SeriesName,ParentIndexNumber,IndexNumber,Overview,ProductionYear&EnableImages=true&api_key=${authData.token}`
          );
          if (fallbackRes.ok) items = (await fallbackRes.json()).Items ?? [];
        }

        if (items.length > 0) {
          try {
            const ids = items.map((i: any) => i.Id).join(",");
            const batchRes = await fetch(`${authData.serverUrl}/Users/${authData.userId}/Items?Ids=${ids}&Fields=UserData&Limit=${items.length}&api_key=${authData.token}`);
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              const udMap: Record<string, any> = {};
              (batchData.Items ?? []).forEach((i: any) => { udMap[i.Id] = i.UserData; });
              items = items.map((item: any) => ({
                ...item, UserData: udMap[item.Id] ? { ...item.UserData, ...udMap[item.Id] } : item.UserData,
              }));
            }
          } catch {}
        }

        const history = JSON.parse(localStorage.getItem("localPlayHistory") || "{}");
        items.sort((a: any, b: any) => {
          const aLocal = Math.max(history[a.Id] || 0, history[a.SeriesId] || 0);
          const bLocal = Math.max(history[b.Id] || 0, history[b.SeriesId] || 0);
          if (aLocal !== bLocal) return bLocal - aLocal;
          const aDate = new Date(a.UserData?.LastPlayedDate || 0).getTime();
          const bDate = new Date(b.UserData?.LastPlayedDate || 0).getTime();
          if (aDate !== bDate) return bDate - aDate;
          return 0;
        });

        const seenSeries = new Set<string>();
        const hidden = JSON.parse(localStorage.getItem("hiddenContinueWatching") || "[]");
        const deduped: any[] = [];
        
        items.forEach((item: any) => {
          if (hidden.includes(item.Id) || (item.SeriesId && hidden.includes(item.SeriesId))) return;
          if (item.Type === "Episode" && item.SeriesId) {
            if (!seenSeries.has(item.SeriesId)) {
              seenSeries.add(item.SeriesId);
              deduped.push(item);
            }
          } else {
            deduped.push(item);
          }
        });

        setContinueWatching(deduped.slice(0, 20));
      } catch (err) {
        setContinueWatching([]);
      } finally {
        setLoading(false);
        if (onLoadingChange) onLoadingChange(false);
      }
    }
    load();
  }, [authData, refreshKey, onLoadingChange]);

  const handleMarkWatched = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); e.preventDefault();
    setContinueWatching((prev) => prev.filter(item => item.Id !== itemId));
    try { await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${itemId}?api_key=${authData.token}`, { method: "POST" }); } catch (err) {}
  };

  const handleRemove = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); e.preventDefault();
    setContinueWatching((prev) => prev.filter(i => i.Id !== item.Id));
    const hidden = JSON.parse(localStorage.getItem("hiddenContinueWatching") || "[]");
    hidden.push(item.Id);
    if (item.SeriesId) hidden.push(item.SeriesId);
    localStorage.setItem("hiddenContinueWatching", JSON.stringify(hidden));
    try { await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayingItems/${item.Id}?api_key=${authData.token}`, { method: "DELETE" }); } catch (err) {}
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setCanScrollLeft(scrollRef.current.scrollLeft > 10);
    setCanScrollRight(scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300 * 3 + 16 * 3;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const openDetails = (item: any) => {
    const isSeriesChild = Boolean(item.SeriesId);
    const detailsId = isSeriesChild ? item.SeriesId : item.Id;
    navigate(`/title/${detailsId}`, {
      state: { item: isSeriesChild ? { Id: detailsId, Name: item.SeriesName || item.Name, Type: "Series" } : item },
    });
  };

  const playItem = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    navigate(`/play/${item.Id}`, { state: { item } });
  };

  useEffect(() => { handleScroll(); }, [continueWatching]);

  if (!loading && continueWatching.length === 0) return null;

  return (
    <div className="mb-12 relative group/row" style={{ animation: "rowFadeIn 0.5s ease-out both" }}>
      
      {/* ── Sub-section Header (Discovery Style) ── */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
          Continue Watching
        </h2>
      </div>

      {canScrollLeft && (
        <button onClick={() => scroll("left")} className="absolute left-0 top-[60%] -translate-y-1/2 -translate-x-6 z-30 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide scroll-smooth" style={{ scrollSnapType: "x mandatory" }}>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px] md:w-[320px] animate-pulse">
              <div className="w-full aspect-video bg-white/5 rounded-xl mb-3" />
              <div className="h-3 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-2 bg-white/5 rounded w-1/4" />
            </div>
          ))
        ) : (
          continueWatching.map((item) => {
            const ticksLeft = (item.RunTimeTicks || 0) - (item.UserData?.PlaybackPositionTicks || 0);
            const minsLeft = Math.max(1, Math.floor(ticksLeft / 600_000_000));
            const progressPct = item.UserData?.PlaybackPositionTicks && item.RunTimeTicks ? Math.min((item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100, 100) : 0;
            const imgUrl = item.ImageTags?.Primary ? `${authData.serverUrl}/Items/${item.Id}/Images/Primary?fillWidth=600&quality=90&api_key=${authData.token}` : `${authData.serverUrl}/Items/${item.SeriesId || item.Id}/Images/Backdrop?fillWidth=600&quality=90&api_key=${authData.token}`;
            
            const isEpisode = item.Type === "Episode";
            const topText = isEpisode ? `S${item.ParentIndexNumber} E${item.IndexNumber}` : (item.ProductionYear || "Movie");
            const mainTitle = isEpisode ? item.Name : item.Name;

            return (
              <div key={item.Id} className="flex flex-col flex-shrink-0 w-[280px] md:w-[320px] group cursor-pointer" style={{ scrollSnapAlign: "start" }} onClick={() => openDetails(item)}>
                
                {/* Image & Overlays */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1A1A24] mb-3 shadow-lg border border-white/5 group-hover:border-white/10 transition-colors">
                  <img src={imgUrl} alt={item.Name} className="w-full h-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-50" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SAFE_PLACEHOLDER; }} />
                  
                  {/* Purple Accent Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-white/10 z-10">
                    <div className="h-full bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent-glow)] transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  
                  {/* Hover Actions (Play, Mark, Hide) */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-between p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => handleMarkWatched(e, item.Id)} className="w-8 h-8 bg-black/60 hover:bg-white hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110" title="Mark as Watched"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                      <button onClick={(e) => handleRemove(e, item)} className="w-8 h-8 bg-black/60 hover:bg-white hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110" title="Hide / Clear Progress"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button onClick={(e) => playItem(e, item)} className="w-12 h-12 bg-white/10 border border-white/20 hover:bg-white hover:text-black rounded-full flex items-center justify-center shadow-2xl pointer-events-auto transition-transform hover:scale-110" title="Play"><svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></button>
                    </div>
                  </div>
                </div>

                {/* Text Metadata below card matching mockup */}
                <div className="px-1 flex flex-col gap-0.5">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">
                    {topText}
                  </p>
                  <h4 className="font-bold text-sm md:text-base text-gray-200 group-hover:text-white transition-colors truncate">
                    {mainTitle}
                  </h4>
                  <p className="text-gray-500 text-xs font-medium">
                    {minsLeft}m left
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canScrollRight && !loading && continueWatching.length > 0 && (
        <button onClick={() => scroll("right")} className="absolute right-0 top-[60%] -translate-y-1/2 translate-x-6 z-30 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
      
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}