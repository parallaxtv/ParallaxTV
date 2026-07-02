import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";

const SAFE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

interface UpNextRowProps {
  authData: AuthData;
  refreshKey?: number;
  onInteraction: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function UpNextRow({ 
  authData, 
  refreshKey, 
  onInteraction,
  onLoadingChange
}: UpNextRowProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // ── Fetch Up Next Data ──
  useEffect(() => {
    if (!authData) return;
    if (onLoadingChange) onLoadingChange(true);
    setLoading(true);

    async function load() {
      try {
        const res = await fetch(
          `${authData.serverUrl}/Shows/NextUp` +
          `?UserId=${authData.userId}&Limit=30` +
          `&Fields=UserData,RunTimeTicks,SeriesId,SeriesName,ParentIndexNumber,IndexNumber,Overview,ImageTags` +
          `&EnableImages=true&api_key=${authData.token}`
        );
        const data = res.ok ? await res.json() : { Items: [] };
        
        const hidden = JSON.parse(localStorage.getItem("hiddenNextUp") || "[]");
        
        let filtered = (data.Items ?? [])
          .filter((ep: any) => !(ep.UserData?.PlaybackPositionTicks > 0))
          .filter((ep: any) => !hidden.includes(ep.Id) && !hidden.includes(ep.SeriesId));

        // ── SORTING: Trust VideoPlayer's Local History First ──
        const history = JSON.parse(localStorage.getItem("localPlayHistory") || "{}");
        
        filtered.sort((a: any, b: any) => {
          // Check history via Series ID since this is a new, unplayed episode
          const aLocal = history[a.SeriesId] || 0;
          const bLocal = history[b.SeriesId] || 0;
          
          if (aLocal !== bLocal) return bLocal - aLocal;
          return 0; // Fallback to server's default order
        });
          
        setItems(filtered.slice(0, 20));
      } catch (err) {
        console.error("Up Next failed", err);
      } finally {
        setLoading(false);
        if (onLoadingChange) onLoadingChange(false);
      }
    }
    load();
  }, [authData, refreshKey, onLoadingChange]);

  // ── Scroll Logic ──
  const handleScroll = () => {
    if (!scrollRef.current) return;
    setCanScrollLeft(scrollRef.current.scrollLeft > 5);
    setCanScrollRight(scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 5);
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300 * 3 + 16 * 3; // Match the scroll amount to the new 300px card widths
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => {
    handleScroll();
  }, [items]);

  // ── Action Handlers ──
  const handleToggleWatched = async (e: React.MouseEvent, ep: any) => {
    e.stopPropagation();
    e.preventDefault();
    setItems(prev => prev.filter(item => item.Id !== ep.Id));

    try {
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${ep.Id}?api_key=${authData.token}`, { method: "POST" });
    } catch (err) { 
      console.error("Failed to mark watched", err);
    } finally { 
      onInteraction(); 
    }
  };

  const handleRemoveProgress = async (e: React.MouseEvent, ep: any) => {
    e.stopPropagation();
    e.preventDefault();
    setItems(prev => prev.filter(item => item.Id !== ep.Id));
    
    const hidden = JSON.parse(localStorage.getItem("hiddenNextUp") || "[]");
    hidden.push(ep.SeriesId || ep.Id); 
    localStorage.setItem("hiddenNextUp", JSON.stringify(hidden));
  };

  const openDetails = (ep: any) => {
    const detailsId = ep.SeriesId || ep.Id;
    navigate(`/title/${detailsId}`, {
      state: { item: { Id: detailsId, Name: ep.SeriesName || ep.Name, Type: "Series" } },
    });
  };

  const playEpisode = (e: React.MouseEvent, ep: any) => {
    e.stopPropagation();
    navigate(`/play/${ep.Id}`, { state: { item: ep } });
  };

  if (!loading && items.length === 0) return null;

  return (
    <div className="mb-10 relative group/row">
      
      {/* ── Sub-section Header (Discovery Style) ── */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
          Up Next
        </h2>
      </div>

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
          items.map((ep) => {
            const hasEpImage = ep.ImageTags && ep.ImageTags.Primary;
            const epImgSrc = hasEpImage 
              ? `${authData.serverUrl}/Items/${ep.Id}/Images/Primary?fillWidth=600&quality=90&api_key=${authData.token}` 
              : `${authData.serverUrl}/Items/${ep.SeriesId}/Images/Backdrop?fillWidth=600&quality=90&api_key=${authData.token}`;

            return (
              <div key={ep.Id} className="flex-shrink-0 w-[300px] group cursor-pointer" style={{ scrollSnapAlign: "start" }} onClick={() => openDetails(ep)}>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1e1e1e] mb-3 shadow-lg">
                  <img src={epImgSrc} alt={ep.Name} className="w-full h-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-50" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SAFE_PLACEHOLDER; }} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-between p-2.5">
                    
                    {/* ── Matched Small Hover Actions ── */}
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => handleToggleWatched(e, ep)} className="w-8 h-8 bg-black/60 hover:bg-white hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110" title="Mark as Watched"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                      <button onClick={(e) => handleRemoveProgress(e, ep)} className="w-8 h-8 bg-black/60 hover:bg-white hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110" title="Hide from Up Next"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    
                    {/* ── Matched Play Button ── */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button onClick={(e) => playEpisode(e, ep)} className="w-12 h-12 bg-white/10 border border-white/20 hover:bg-white hover:text-black rounded-full flex items-center justify-center shadow-2xl pointer-events-auto transition-transform hover:scale-110" title="Play">
                        {/* Note: fill-current allows the text-black hover to change the icon color */}
                        <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </button>
                    </div>

                  </div>
                </div>
                <div className="px-0.5">
                  <h4 className="font-semibold text-sm truncate text-white leading-snug">{ep.SeriesName}</h4>
                  <p className="text-gray-400 text-[11px] font-medium mt-0.5 truncate">S{ep.ParentIndexNumber} E{ep.IndexNumber} • {ep.Name}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canScrollRight && !loading && items.length > 0 && (
        <button onClick={() => scroll("right")} className="absolute right-0 top-[55%] -translate-y-1/2 translate-x-5 z-30 w-12 h-12 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}