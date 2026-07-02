import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";

// ─── Library card ─────────────────────────────────────────────────────────────

// Change authData: any to authData: AuthData
function LibraryCard({ lib, authData }: { lib: any; authData: AuthData }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const primarySrc  = `${authData.serverUrl}/Items/${lib.Id}/Images/Primary?fillWidth=600&fillHeight=340&quality=94&api_key=${authData.token}`;
  const backdropSrc = `${authData.serverUrl}/Items/${lib.Id}/Images/Backdrop?fillWidth=600&fillHeight=340&quality=94&api_key=${authData.token}`;

  return (
    <div
      className="flex-shrink-0 w-[280px] cursor-pointer group"
      style={{ scrollSnapAlign: "start" }}
      onClick={() => navigate(`/library/${lib.Id}`, { state: { library: lib } })}
    >
      <div className="relative w-full h-[158px] rounded-2xl overflow-hidden bg-[#1a1a1a] shadow-xl
        transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-2xl group-hover:shadow-black/70">

        {/* Cover image */}
        <img
          src={imgError ? backdropSrc : primarySrc}
          alt={lib.Name}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-40"
          onError={() => setImgError(true)}
        />

        {/* Base gradient — always visible, dark at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent
          transition-opacity duration-300 group-hover:opacity-0" />

        {/* Hover gradient — full vignette */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Default state: name at bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2">
          <span
            className="text-white font-black drop-shadow-lg leading-tight block"
            style={{
              fontSize: "clamp(16px, 2vw, 22px)",
              letterSpacing: "-0.02em",
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            {lib.Name}
          </span>
        </div>

        {/* Hover state: centered name + browse pill */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3
          opacity-0 group-hover:opacity-100 transition-all duration-300
          translate-y-2 group-hover:translate-y-0">
          <span
            className="text-white font-black text-center px-4 leading-tight"
            style={{
              fontSize: "clamp(18px, 2.2vw, 26px)",
              letterSpacing: "-0.03em",
              textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.6)",
              fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            {lib.Name}
          </span>

        </div>

        {/* Subtle accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)]/60 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LibrarySkeleton() {
  return (
    <div className="flex-shrink-0 w-[280px]">
      <div className="w-full h-[158px] rounded-2xl bg-white/5 animate-pulse" />
    </div>
  );
}

// ─── LibraryRow ───────────────────────────────────────────────────────────────

// Change authData: any to authData: AuthData
export function LibraryRow({ authData }: { authData: AuthData }) {
  const [libraries, setLibraries] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const scrollRef                 = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft]     = useState(false);
  const [canRight, setCanRight]   = useState(false);

  useEffect(() => {
    if (!authData) return;
    async function load() {
      try {
        const res  = await fetch(
          `${authData.serverUrl}/Users/${authData.userId}/Views?api_key=${authData.token}`
        );
        const data = await res.json();
        const media = (data.Items ?? []).filter((l: any) =>
          !["livetv", "channels", "music", "playlists", "boxsets"].includes(
            l.CollectionType?.toLowerCase() ?? ""
          )
        );
        setLibraries(media);
      } catch (err) {
        console.error("Libraries fetch failed", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authData]);

  const syncArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    syncArrows();
    const el = scrollRef.current;
    el?.addEventListener("scroll", syncArrows);
    const ro = new ResizeObserver(syncArrows);
    if (el) ro.observe(el);
    return () => { el?.removeEventListener("scroll", syncArrows); ro.disconnect(); };
  }, [libraries]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -900 : 900, behavior: "smooth" });

  if (!loading && libraries.length === 0) return null;

  return (
    <div className="mb-10" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>

      {/* Header */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-[var(--color-accent)] inline-block" />
          My Libraries
        </h2>
        {!loading && (
          <span className="text-[11px] text-gray-600 font-medium">{libraries.length} libraries</span>
        )}
      </div>

      {/* Scroll container */}
      <div className="relative">
        {canLeft && (
          <button onClick={() => scroll("left")}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center
              bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white
              shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-110">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        )}

        <div ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide"
          style={{ gap: "16px", scrollSnapType: "x mandatory", paddingBottom: "6px", paddingTop: "4px" }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <LibrarySkeleton key={i} />)
            : libraries.map(lib => <LibraryCard key={lib.Id} lib={lib} authData={authData} />)
          }
        </div>

        {canRight && (
          <button onClick={() => scroll("right")}
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center
              bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white
              shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-110">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}