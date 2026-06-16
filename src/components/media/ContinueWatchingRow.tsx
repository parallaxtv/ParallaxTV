import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";

const SAFE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

export function ContinueWatchingRow({ 
  authData, 
  refreshKey, 
  onLoadingChange 
}: { 
  authData: AuthData; // CHANGE THIS
  refreshKey: number; 
  onLoadingChange?: (loading: boolean) => void; 
}) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (!authData) return;
    if (onLoadingChange) onLoadingChange(true);
    setLoading(true);

    async function load() {
      try {
        let items: any[] = [];

        // ── Strategy 1: /Items/Resume
        const resumeRes = await fetch(
          `${authData.serverUrl}/Users/${authData.userId}/Items/Resume` +
          `?Recursive=true&MediaTypes=Video&Limit=50` +
          `&Fields=UserData,RunTimeTicks,SeriesId,SeriesName,ParentIndexNumber,IndexNumber,Overview,ProductionYear` +
          `&EnableImages=true&api_key=${authData.token}`
        );
        if (resumeRes.ok) items = (await resumeRes.json()).Items ?? [];

        // ── Strategy 2: IsResumable fallback
        if (items.length === 0) {
          const fallbackRes = await fetch(
            `${authData.serverUrl}/Users/${authData.userId}/Items` +
            `?Filters=IsResumable&Recursive=true&SortBy=DatePlayed&SortOrder=Descending` +
            `&IncludeItemTypes=Movie,Episode&Limit=50` +
            `&Fields=UserData,RunTimeTicks,SeriesId,SeriesName,ParentIndexNumber,IndexNumber,Overview,ProductionYear` +
            `&EnableImages=true&api_key=${authData.token}`
          );
          if (fallbackRes.ok) items = (await fallbackRes.json()).Items ?? [];
        }

        // ── Enrich: batch-fetch UserData
        if (items.length > 0) {
          try {
            const ids = items.map((i: any) => i.Id).join(",");
            const batchRes = await fetch(
              `${authData.serverUrl}/Users/${authData.userId}/Items` +
              `?Ids=${ids}&Fields=UserData&Limit=${items.length}` +
              `&api_key=${authData.token}`
            );
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              const udMap: Record<string, any> = {};
              (batchData.Items ?? []).forEach((i: any) => { udMap[i.Id] = i.UserData; });
              items = items.map((item: any) => ({
                ...item,
                UserData: udMap[item.Id] ? { ...item.UserData, ...udMap[item.Id] } : item.UserData,
              }));
            }
          } catch {}
        }

        // ── SORTING: Trust VideoPlayer's Local History First ──
        const history = JSON.parse(localStorage.getItem("localPlayHistory") || "{}");

        items.sort((a: any, b: any) => {
          const aLocal = Math.max(history[a.Id] || 0, history[a.SeriesId] || 0);
          const bLocal = Math.max(history[b.Id] || 0, history[b.SeriesId] || 0);

          // 1. Sort by Local History (Highest/Most Recent first)
          if (aLocal !== bLocal) return bLocal - aLocal;

          // 2. Fallback to Server's Date
          const aDate = new Date(a.UserData?.LastPlayedDate || 0).getTime();
          const bDate = new Date(b.UserData?.LastPlayedDate || 0).getTime();
          if (aDate !== bDate) return bDate - aDate;
          
          return 0;
        });

        // ── Deduplicate & Filter Hidden ──
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
        console.error("❌ Continue Watching failed:", err);
        setContinueWatching([]);
      } finally {
        setLoading(false);
        if (onLoadingChange) onLoadingChange(false);
      }
    }
    
    load();
  }, [authData, refreshKey]);

  // ─── API ACTIONS ─────────────────────────────────────────────────────────

  const handleMarkWatched = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    setContinueWatching((prev) => prev.filter(item => item.Id !== itemId));
    try {
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${itemId}?api_key=${authData.token}`, { method: "POST" });
    } catch (err) { console.error("Failed to mark item as watched", err); }
  };

  const handleRemove = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); 
    e.preventDefault();
    setContinueWatching((prev) => prev.filter(i => i.Id !== item.Id));

    const hidden = JSON.parse(localStorage.getItem("hiddenContinueWatching") || "[]");
    hidden.push(item.Id);
    if (item.SeriesId) hidden.push(item.SeriesId);
    localStorage.setItem("hiddenContinueWatching", JSON.stringify(hidden));

    try {
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayingItems/${item.Id}?api_key=${authData.token}`, { method: "DELETE" });
    } catch (err) { console.error("Failed to remove item progress", err); }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setCanScrollLeft(scrollRef.current.scrollLeft > 5);
    setCanScrollRight(scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 5);
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
    <div className="mb-10 relative group/row">
      <h3 className="text-xl font-bold text-white mb-4">Continue Watching</h3>

      {canScrollLeft && (
        <button onClick={() => scroll("left")} className="absolute left-0 top-[55%] -translate-y-1/2 -translate-x-5 z-30 w-12 h-12 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[300px] animate-pulse">
              <div className="w-full aspect-video bg-white/5 rounded-xl mb-3" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))
        ) : (
          continueWatching.map((item) => {
            const progressPct = item.UserData?.PlaybackPositionTicks && item.RunTimeTicks ? (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100 : 0;
            const imgUrl = item.ImageTags?.Primary ? `${authData.serverUrl}/Items/${item.Id}/Images/Primary?fillWidth=600&quality=90&api_key=${authData.token}` : `${authData.serverUrl}/Items/${item.SeriesId || item.Id}/Images/Backdrop?fillWidth=600&quality=90&api_key=${authData.token}`;

            return (
              <div key={item.Id} className="flex-shrink-0 w-[300px] group cursor-pointer" style={{ scrollSnapAlign: "start" }} onClick={() => openDetails(item)}>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1e1e1e] mb-3 shadow-lg">
                  <img src={imgUrl} alt={item.Name} className="w-full h-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-50" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SAFE_PLACEHOLDER; }} />
                  {progressPct > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/60 z-10"><div className="h-full bg-red-600 transition-all" style={{ width: `${progressPct}%` }} /></div>
                  )}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-between p-2.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => handleMarkWatched(e, item.Id)} className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110" title="Mark as Watched"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                      <button onClick={(e) => handleRemove(e, item)} className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110" title="Hide / Clear Progress"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button onClick={(e) => playItem(e, item)} className="w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-2xl drop-shadow-2xl pointer-events-auto transition-transform hover:scale-110" title="Play"><svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between mb-1 px-0.5">
                  <h4 className="font-semibold text-sm text-white truncate pr-2 flex-1 leading-snug">
                    {item.Type === "Episode" && <span className="text-gray-400 mr-1.5 font-normal">S{item.ParentIndexNumber}:E{item.IndexNumber}</span>}
                    {item.Type === "Episode" ? item.SeriesName : item.Name}
                  </h4>
                </div>
                <p className="text-gray-400 text-xs truncate px-0.5">{item.Type === "Episode" ? item.Name : (item.ProductionYear || "")}</p>
              </div>
            );
          })
        )}
      </div>

      {canScrollRight && !loading && continueWatching.length > 0 && (
        <button onClick={() => scroll("right")} className="absolute right-0 top-[55%] -translate-y-1/2 translate-x-5 z-30 w-12 h-12 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}
