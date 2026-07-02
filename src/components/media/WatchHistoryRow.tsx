import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";

const SAFE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

export function WatchHistoryRow({ 
  authData, 
  refreshKey, 
  onInteraction 
}: { 
  authData: AuthData;
  refreshKey?: number; 
  onInteraction?: () => void; 
}) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  // ── Fetch Watch History ──
  useEffect(() => {
    if (!authData) return;
    async function load() {
      try {
        // 1. Fetch recent Movies and Episodes to get accurate 'DatePlayed' timelines
        const historyRes = await fetch(
          `${authData.serverUrl}/Users/${authData.userId}/Items` +
          `?Filters=IsPlayed&Recursive=true&SortBy=DatePlayed&SortOrder=Descending` +
          `&IncludeItemTypes=Movie,Episode&Limit=100` +
          `&Fields=UserData,CommunityRating,ImageTags,ProductionYear,DatePlayed,SeriesId` +
          `&api_key=${authData.token}`
        );
        const historyData = await historyRes.json();
        const historyItems = historyData.Items ?? [];

        // 2. Separate Movies and Episodes
        const movies = historyItems.filter((i: any) => i.Type === "Movie");
        const episodes = historyItems.filter((i: any) => i.Type === "Episode");

        // 3. Find unique Series you watched recently and map their actual play dates
        const seriesPlayDates = new Map<string, string>();
        const seriesIds: string[] = [];
        
        episodes.forEach((ep: any) => {
          if (ep.SeriesId && !seriesPlayDates.has(ep.SeriesId)) {
            seriesPlayDates.set(ep.SeriesId, ep.UserData?.LastPlayedDate || ep.DatePlayed);
            seriesIds.push(ep.SeriesId);
          }
        });

        let fullyWatchedSeries: any[] = [];
        
        if (seriesIds.length > 0) {
          // 4. Ask Jellyfin if the *entire* Series is marked as watched
          const seriesRes = await fetch(
            `${authData.serverUrl}/Users/${authData.userId}/Items` +
            `?Ids=${seriesIds.join(",")}` +
            `&Fields=UserData,CommunityRating,ImageTags,ProductionYear` +
            `&api_key=${authData.token}`
          );
          const seriesData = await seriesRes.json();
          
          // 5. Filter to ONLY include shows that are 100% finished
          fullyWatchedSeries = (seriesData.Items ?? []).filter((s: any) => s.UserData?.Played === true);
          
          // Inject the accurate DatePlayed from the episode so sorting works!
          fullyWatchedSeries.forEach(s => {
            s.DatePlayed = seriesPlayDates.get(s.Id);
          });
        }

        // 6. Combine completed Movies and Series, sort chronologically, and limit to 50
        const combined = [...movies, ...fullyWatchedSeries].sort((a, b) => {
          const dateA = new Date(a.DatePlayed || 0).getTime();
          const dateB = new Date(b.DatePlayed || 0).getTime();
          return dateB - dateA;
        });

        setItems(combined.slice(0, 50));
      } catch (err) {
        console.error("Watch history failed", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authData, refreshKey]);

  // ── Scroll Logic ──
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 150 * 4; // Scroll ~4 posters at a time
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const updateArrows = () => {
    if (!scrollRef.current) return;
    setCanLeft(scrollRef.current.scrollLeft > 4);
    setCanRight(scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", updateArrows);
    return () => { if (el) el.removeEventListener("scroll", updateArrows); };
  }, [items]);

  // ── Action Handlers ──
  const handleRemoveWatched = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Optimistic UI: Instantly remove this item from the local array
    setItems(prev => prev.filter(i => i.Id !== item.Id));

    try {
      // DELETE /PlayedItems removes the "Watched" checkmark on the server
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${item.Id}?api_key=${authData.token}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to mark unwatched", err);
    } finally {
      if (onInteraction) onInteraction();
    }
  };

  const playItem = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    navigate(`/play/${item.Id}`, { state: { item } });
  };

  if (!loading && items.length === 0) return null;

  return (
    <div className="mb-10 relative group/row" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
      
      {/* ── Sub-section Header (Premium Typography) ── */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
          Watch History
        </h2>
      </div>

      <div className="relative">
        {/* Matched Left Arrow */}
        {canLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-30 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide pb-4 pt-2 -mt-2 -mx-2 px-2"
          style={{ gap: "16px", scrollSnapType: "x mandatory" }}
        >
          {loading ? (
            // Skeletons
            [...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[150px]">
                <div className="w-full h-[225px] rounded-xl bg-white/5 animate-pulse mb-2.5" />
                <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-1.5" />
                <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse" />
              </div>
            ))
          ) : (
            items.map((item) => {
              const hasImage = item.ImageTags && item.ImageTags.Primary;
              const imgSrc = hasImage
                ? `${authData.serverUrl}/Items/${item.Id}/Images/Primary?fillHeight=450&fillWidth=300&quality=92&api_key=${authData.token}`
                : SAFE_PLACEHOLDER;

              return (
                <div
                  key={item.Id}
                  className="flex-shrink-0 w-[150px] group cursor-pointer"
                  style={{ scrollSnapAlign: "start" }}
                  onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
                >
                  <div className="relative w-full h-[225px] rounded-xl overflow-hidden bg-[#1c1c1c] mb-2.5 shadow-lg group-hover:scale-[1.04] group-hover:shadow-2xl transition-all duration-300">
                    <img
                      src={imgSrc}
                      alt={item.Name}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-50"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SAFE_PLACEHOLDER; }}
                    />

                    {/* Rating Badge */}
                    {item.CommunityRating && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded z-10 group-hover:opacity-0 transition-opacity">
                        <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span className="text-[10px] font-bold text-white tabular-nums">{item.CommunityRating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Overlay Controls */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-start p-2 pointer-events-none">
                      
                      <div className="flex justify-end pointer-events-auto">
                        {/* Matched Remove Button */}
                        <button
                          onClick={(e) => handleRemoveWatched(e, item)}
                          className="w-8 h-8 bg-black/60 hover:bg-white hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110"
                          title="Remove from Watch History"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      {/* Matched Frosted Glass Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button 
                          onClick={(e) => playItem(e, item)}
                          className="w-12 h-12 bg-white/10 border border-white/20 hover:bg-white hover:text-black rounded-full flex items-center justify-center shadow-2xl pointer-events-auto transition-transform hover:scale-110" 
                          title="Play"
                        >
                          <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-gray-300 truncate px-0.5 group-hover:text-white transition-colors leading-snug">
                    {item.Name}
                  </p>
                  {item.ProductionYear && (
                    <p className="text-[11px] text-gray-500 px-0.5 mt-0.5 truncate">{item.ProductionYear}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Matched Right Arrow */}
        {canRight && !loading && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-30 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}