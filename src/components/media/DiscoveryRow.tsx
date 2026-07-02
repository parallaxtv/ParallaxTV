import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";
import { DiscoveryItem } from "../../types/discovery";

// ─── Smart Hooks ───
import { useDiscovery } from "../../hooks/useDiscovery";
import { useDiscoveryDetails } from "../../hooks/useDiscoveryDetails";

// ─── UI Components ───
import { DiscoveryCard } from "./discovery/DiscoveryCard";
import { DiscoveryModal } from "./discovery/DiscoveryModal";
import { DiscoveryTrailer } from "./discovery/DiscoveryTrailer";
import { DiscoverySkeleton } from "./discovery/DiscoverySkeleton";

export function DiscoveryRow({
  type,
  title,
  authData,
}: {
  type: "anime" | "kdrama" | "movies" | "seasonal";
  title: string;
  authData: AuthData;
}) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Data Orchestration
  const { items, loading, getLibraryMatch } = useDiscovery(type, authData);
  
  // 2. UI State
  const [selected, setSelected] = useState<DiscoveryItem | null>(null);
  const [fullscreenTrailer, setFullscreenTrailer] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  // 3. Modal Orchestration
  const { detailData, detailLoading, trailerKey } = useDiscoveryDetails(type, selected);

  // ── Scroll Logic ──
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -(175 * 4) : 175 * 4, behavior: "smooth" });
  };

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", updateArrows);
    return () => el?.removeEventListener("scroll", updateArrows);
  }, [items]);

  if (!loading && items.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes drawerUp { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .discovery-card:hover .card-drawer { animation: drawerUp 0.18s ease-out forwards; display:flex; }
        .discovery-card .card-drawer { display:none; }
        @keyframes dFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes rowFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      {/* Added group/row here to trigger the arrow fade-in on hover */}
      <div className="mb-10 relative group/row" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
        
        {/* Header */}
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
            <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
            {title}
          </h2>
          <span className="text-[11px] text-gray-600 font-medium">
            {type === "anime" || type === "seasonal" ? "via MyAnimeList" : "via TMDB"}
          </span>
        </div>

        <div className="relative">
          {/* Matched Left Arrow styling with ContinueWatching/UpNext */}
          {canLeft && (
            <button onClick={() => scroll("left")} className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}

          <div ref={scrollRef} className="flex overflow-x-auto scrollbar-hide" style={{ gap: "14px", scrollSnapType: "x mandatory", overflowY: "visible", paddingTop: "4px", paddingBottom: "8px" }}>
            {loading
              ? [...Array(8)].map((_, i) => <DiscoverySkeleton key={i} />)
              : items.map((item, i) => {
                  const match = getLibraryMatch(item);
                  return (
                    <DiscoveryCard
                      key={`${item.id}-${i}`}
                      item={item}
                      match={match}
                      onClick={() => match
                        ? navigate(`/title/${match.Id}`, { state: { item: match } })
                        : setSelected(item)
                      }
                    />
                  );
                })}
          </div>

          {/* Matched Right Arrow styling with ContinueWatching/UpNext */}
          {canRight && !loading && (
            <button onClick={() => scroll("right")} className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/row:opacity-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <DiscoveryModal
          selected={selected}
          detailData={detailData}
          detailLoading={detailLoading}
          trailerKey={trailerKey}
          onClose={() => { setSelected(null); setFullscreenTrailer(false); }}
          onSimilarClick={(s) => setSelected({ ...s, description: undefined, cast: [], genres: [] })}
          onPlayTrailer={() => setFullscreenTrailer(true)}
        />
      )}

      {/* ── Fullscreen Trailer Player ── */}
      {fullscreenTrailer && trailerKey && selected && (
        <DiscoveryTrailer 
          trailerKey={trailerKey}
          title={selected.title}
          onClose={() => setFullscreenTrailer(false)}
        />
      )}
    </>
  );
}