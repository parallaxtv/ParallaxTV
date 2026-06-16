import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SAFE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

export function WatchHistoryRow({ 
  authData, 
  refreshKey, 
  onInteraction 
}: { 
  authData: any; 
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
        const res = await fetch(
          `${authData.serverUrl}/Users/${authData.userId}/Items` +
          `?Filters=IsPlayed&Recursive=true&SortBy=DatePlayed&SortOrder=Descending` +
          `&IncludeItemTypes=Movie,Series&Limit=30` +
          `&Fields=UserData,CommunityRating,ImageTags,ProductionYear,DatePlayed` +
          `&api_key=${authData.token}`
        );
        const data = await res.json();
        setItems(data.Items ?? []);
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
      // Tell the Dashboard to refresh so things like "Continue Watching" sync up
      if (onInteraction) onInteraction();
    }
  };

  if (!loading && items.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Watch History
      </h2>

      <div className="relative group/row">
        {/* Left Arrow */}
        {canLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-30 w-12 h-12 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-sm transition-all duration-200 hover:scale-110"
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
                      className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-75"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SAFE_PLACEHOLDER; }}
                    />

                    {/* Rating Badge */}
                    {item.CommunityRating && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full z-10 group-hover:opacity-0 transition-opacity">
                        <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span className="text-[10px] font-bold text-white">{item.CommunityRating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Overlay Controls */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-start p-2 pointer-events-none">
                      
                      <div className="flex justify-end pointer-events-auto">
                        {/* Remove from Watch History (Cross Icon) */}
                        <button
                          onClick={(e) => handleRemoveWatched(e, item)}
                          className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110"
                          title="Remove from Watch History"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      {/* Center Play Icon */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                          <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-gray-300 truncate px-0.5 group-hover:text-white transition-colors leading-snug">
                    {item.Name}
                  </p>
                  {item.ProductionYear && (
                    <p className="text-[11px] text-gray-600 px-0.5 mt-0.5">{item.ProductionYear}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Arrow */}
        {canRight && !loading && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-30 w-12 h-12 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-sm transition-all duration-200 hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}