import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../../lib/jellyfinApi";

const SAFE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

// ─── Single source of truth for your Worker URL ───────────────────────────────
const API = "https://parallax-api.parallaxtv-api.workers.dev";

function normTitle(t: string) {
  if (!t) return "";
  return t.toLowerCase().replace(/^(the |a |an )/i,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score?: number }) {
  if (!score) return null;
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-gray-400";
  return (
    <span className={`text-[11px] font-bold tabular-nums ${color}`}>
      {score}<span className="text-[9px] text-gray-500 font-normal">%</span>
    </span>
  );
}

// ─── Cast Strip (modal) ───────────────────────────────────────────────────────
function CastStrip({ cast }: { cast: any[] }) {
  if (!cast?.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <span className="w-3 h-px bg-red-600 inline-block" />
        Cast
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {cast.map((c: any, i: number) => (
          <div key={i} className="flex-shrink-0 w-[84px] flex flex-col items-center text-center">
            <div className="relative w-14 h-14 mb-2">
              <img
                src={c.actorImage || SAFE_PLACEHOLDER}
                className="absolute inset-0 w-full h-full rounded-full object-cover brightness-60 border-2 border-[#1a1a1a]"
                title={c.actorName}
                onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
              />
              <img
                src={c.charImage || SAFE_PLACEHOLDER}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full object-cover border-2 border-[#141414] shadow-lg z-10"
                title={c.charName}
                onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
              />
            </div>
            <span className="text-[10px] font-semibold text-white leading-tight line-clamp-1 w-full">{c.charName}</span>
            <span className="text-[9px] text-gray-500 leading-tight line-clamp-1 w-full mt-0.5">{c.actorName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DiscoveryRow({
  type,
  title,
  authData,
}: {
  type: "anime" | "kdrama" | "movies" | "seasonal";
  title: string;
  authData: any;
}) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<any[]>([]);
  const [libraryDict, setLibraryDict] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trailerKey, setTrailerKey]         = useState<string | null>(null);
  const [fullscreenTrailer, setFullscreenTrailer] = useState(false);

  // Close fullscreen trailer on Escape key
  useEffect(() => {
    if (!fullscreenTrailer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreenTrailer(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenTrailer]);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  // ── Fetch Jellyfin library for cross-referencing ──────────────────────────
  useEffect(() => {
    if (!authData) return;
    async function fetchLib() {
      try {
        // --- NEW CODE START ---
        const baseApi = createJellyfinApi(authData.serverUrl, authData.token);
        const api = getItemsApi(baseApi);
        // --- NEW CODE END ---

        const res = await api.getItems({
          userId: authData.userId,
          recursive: true,
          includeItemTypes: ["Movie", "Series"],
          fields: ["ProductionYear", "OriginalTitle"] as any,
        });
        setLibraryDict(res.data.Items || []);
      } catch (err) {
        console.error("DiscoveryRow: library fetch failed", err);
      }
    }
    fetchLib();
  }, [authData]);

  // ── Fetch from Worker ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const endpoint =
          type === "anime"     ? `${API}/api/anime`          :
          type === "seasonal"  ? `${API}/api/anime/seasonal` :
          type === "kdrama"    ? `${API}/api/kdrama`         :
                                 `${API}/api/movies`;

        const res  = await fetch(endpoint);
        const data = await res.json();

        if (!data.success) return;

        if (type === "anime" || type === "seasonal") {
          // Worker already returns the right shape
          setItems(data.data);
        } else {
          // movies + kdrama — ensure cast is empty array for modal consistency
          setItems(data.data.map((item: any) => ({ ...item, cast: [] })));
        }
      } catch (err) {
        console.error("DiscoveryRow: data fetch failed", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [type]);

  // ── Library match ─────────────────────────────────────────────────────────
  const getLibraryMatch = (item: any) => {
    const n1 = normTitle(item.title);
    const n2 = normTitle(item.altTitle || "");
    return libraryDict.find((lib) => {
      const libNorm  = normTitle(lib.Name || "");
      const origNorm = normTitle(lib.OriginalTitle || "");
      const match = libNorm === n1 || (n2 && libNorm === n2) || origNorm === n1;
      if (!match) return false;
      if (item.year && lib.ProductionYear) return Math.abs(item.year - lib.ProductionYear) <= 1;
      return true;
    });
  };

  // ── Fetch full detail when modal opens ───────────────────────────────────
  // Reset trailer state whenever selected changes
  useEffect(() => {
    setTrailerKey(null);
    setFullscreenTrailer(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) { setDetailData(null); return; }

    setDetailLoading(true);
    setDetailData(null);

    if (type === "anime" || type === "seasonal") {
      // Anime: trailerUrl is now in search results via mapJikanAnime (trailerUrl field).
      // Try it directly first — if missing fall back to a full /api/anime/:id fetch.
      const directUrl = selected.trailerUrl ?? null;
      if (directUrl) {
        const ytMatch = directUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
        if (ytMatch) setTrailerKey(ytMatch[1]);
        setDetailLoading(false);
        return;
      }
      // Fallback: full detail fetch by MAL ID
      const malId = selected.malId ?? selected.id;
      fetch(`${API}/api/anime/${malId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data?.trailerUrl) {
            const ytMatch = data.data.trailerUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
            if (ytMatch) setTrailerKey(ytMatch[1]);
          }
        })
        .catch(() => {})
        .finally(() => setDetailLoading(false));
      return;
    }

    // Movies / K-drama: fetch full detail from TMDB via worker
    const endpoint = type === "movies"
      ? `${API}/api/movies/${selected.id}`
      : `${API}/api/kdrama/${selected.id}`;

    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setDetailData(data.data);
          const ytUrl = data.data?.trailer?.youtubeUrl ?? "";
          const ytMatch = ytUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
          if (ytMatch) setTrailerKey(ytMatch[1]);
        }
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selected?.id]);
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
        @keyframes drawerUp {
          from { opacity:0; transform:translateY(4px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .discovery-card:hover .card-drawer { animation: drawerUp 0.18s ease-out forwards; display:flex; }
        .discovery-card .card-drawer { display:none; }
        @keyframes dFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes rowFadeIn {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      <div className="mb-10" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>

        {/* Header — matches MediaRow/LibraryRow */}
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
            <span className="w-3 h-px bg-red-600 inline-block" />
            {title}
          </h2>
          <span className="text-[11px] text-gray-600 font-medium">
            {type === "anime" || type === "seasonal" ? "via MyAnimeList" : "via TMDB"}
          </span>
        </div>

        <div className="relative">
          {canLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-110"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-hide"
            style={{ gap: "14px", scrollSnapType: "x mandatory", overflowY: "visible", paddingTop: "4px", paddingBottom: "8px" }}
          >
            {loading
              ? [...Array(8)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[175px]" style={{ height: "310px" }}>
                    <div className="w-full h-[263px] rounded-xl bg-white/5 animate-pulse" />
                  </div>
                ))
              : items.map((item, i) => {
                  const match  = getLibraryMatch(item);
                  const accent = item.accentColor || "#e50914";
                  return (
                    <div
                      key={`${item.id}-${i}`}
                      className="discovery-card flex-shrink-0 w-[175px] cursor-pointer group/card relative"
                      style={{ scrollSnapAlign: "start", height: "310px" }}
                      onClick={() => match
                        ? navigate(`/title/${match.Id}`, { state: { item: match } })
                        : setSelected(item)
                      }
                    >
                      {/* Poster — scale only this element, origin top */}
                      <div
                        className="relative w-full h-[263px] rounded-xl overflow-hidden bg-[#1c1c1c] shadow-lg
                          transition-transform duration-300
                          group-hover/card:scale-[1.05]
                          group-hover/card:rounded-b-none
                          group-hover/card:shadow-[0_16px_40px_rgba(0,0,0,0.9)]
                          group-hover/card:z-30"
                        style={{ transformOrigin: "top center", willChange: "transform" }}
                      >
                        <img
                          src={item.posterUrl || SAFE_PLACEHOLDER}
                          alt={item.title}
                          className="w-full h-full object-cover transition-all duration-300 group-hover/card:brightness-50"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SAFE_PLACEHOLDER; }}
                        />

                        {/* Score top-left */}
                        {item.score && (
                          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm rounded px-1.5 py-0.5 z-10">
                            <ScoreBadge score={item.score} />
                          </div>
                        )}

                        {/* TMDB rating for movies/kdrama */}
                        {item.rating && !item.score && (
                          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm rounded px-1.5 py-0.5 z-10 flex items-center gap-1">
                            <svg className="w-2.5 h-2.5 fill-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <span className="text-[11px] font-bold text-white tabular-nums">{item.rating}</span>
                          </div>
                        )}

                        {/* Library dot top-right */}
                        {match && (
                          <div
                            className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: accent }}
                            title="In your library"
                          >
                            <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        )}

                        {/* Centre hover: play or More Info */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-20 pointer-events-none">
                          {match ? (
                            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl">
                              <svg className="w-6 h-6 fill-black translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full shadow-xl">
                              More Info
                            </span>
                          )}
                        </div>

                        {/* Bottom genre strip */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                        {item.genres?.length > 0 && (
                          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 z-10 pointer-events-none">
                            {item.genres.slice(0, 2).map((g: string) => (
                              <span key={g} className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">{g}</span>
                            ))}
                          </div>
                        )}

                        {/* Year drawer — floats outside flow */}
                        {item.year && (
                          <div
                            className="card-drawer absolute left-0 right-0 bg-[#1c1c1c] border border-t-0 border-white/8 rounded-b-xl px-3 py-2 flex-col shadow-xl z-40"
                            style={{ top: "100%" }}
                          >
                            <p className="text-[11px] text-gray-400 tabular-nums">{item.year}</p>
                          </div>
                        )}
                      </div>

                      {/* Below-card title + year — fixed in reserved space, fades on hover */}
                      <div className="absolute bottom-0 left-0 right-0 h-[47px] px-0.5 pt-2 group-hover/card:opacity-0 transition-opacity duration-200 pointer-events-none">
                        <p className="text-[11px] font-semibold text-gray-300 truncate leading-snug">{item.title}</p>
                        {item.year && <p className="text-[10px] text-gray-600 mt-0.5">{item.year}</p>}
                      </div>
                    </div>
                  );
                })}
          </div>

          {canRight && !loading && (
            <button
              onClick={() => scroll("right")}
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-white/30 rounded-full text-white shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-110"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Detail Modal (non-library items only) ────────────────────────────── */}
      {selected && (() => {
        const accent = selected.accentColor || "#e50914";
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-16"
            style={{ animation: "dFadeIn 0.18s ease-out" }}
            onClick={() => setSelected(null)}
          >
            <div
              className="relative w-full max-w-3xl bg-[#141414] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9)] border border-white/8 flex flex-col max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Backdrop */}
              <div className="relative h-44 md:h-60 flex-shrink-0 bg-[#1c1c1c] overflow-hidden">
                <img
                  src={selected.backdropUrl || selected.posterUrl || SAFE_PLACEHOLDER}
                  alt={selected.title}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />

                {/* Close button */}
                <button
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-white text-white hover:text-black rounded-full flex items-center justify-center transition-all backdrop-blur-md z-50"
                  onClick={() => setSelected(null)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>

                <div className="absolute bottom-0 left-0 px-7 pb-4 pr-14">
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                    {selected.title}
                  </h2>
                  {selected.nativeTitle && selected.nativeTitle !== selected.title && (
                    <p className="text-xs text-gray-500 mt-0.5">{selected.nativeTitle}</p>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-7 overflow-y-auto scrollbar-hide flex flex-col gap-5">
                {/* Meta */}
                <div className="flex flex-wrap items-center gap-2">
                  {selected.year && <span className="text-sm font-semibold text-gray-300">{selected.year}</span>}
                  {(detailData?.runtime) && (
                    <span className="text-[11px] text-gray-500">{detailData.runtime}m</span>
                  )}
                  {selected.score && (
                    <span className="flex items-center gap-1 bg-white/6 border border-white/10 px-2 py-0.5 rounded text-[11px]">
                      <ScoreBadge score={selected.score} />
                    </span>
                  )}
                  {(detailData?.rating ?? selected.rating) && !selected.score && (
                    <span className="flex items-center gap-1 bg-white/6 border border-white/10 px-2 py-0.5 rounded text-[11px]">
                      <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <span className="text-white font-bold tabular-nums">{detailData?.rating ?? selected.rating}</span>
                    </span>
                  )}
                  {selected.studio && (
                    <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/8">{selected.studio}</span>
                  )}
                  {(detailData?.genres ?? selected.genres)?.map((g: string) => (
                    <span key={g} className="text-[10px] uppercase tracking-wider text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/8">{g}</span>
                  ))}
                </div>

                {/* Tagline */}
                {detailData?.tagline && (
                  <p className="text-xs text-gray-600 italic">"{detailData.tagline}"</p>
                )}

                {/* Description */}
                {(detailData?.description ?? selected.description) && (
                  <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">
                    {detailData?.description ?? selected.description}
                  </p>
                )}

                {/* Cast — skeleton while loading, then real data */}
                {detailLoading ? (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <span className="w-3 h-px bg-red-600 inline-block" />Cast
                    </p>
                    <div className="flex gap-3">
                      {[...Array(6)].map((_,i) => (
                        <div key={i} className="flex-shrink-0 w-[72px] flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
                          <div className="w-10 h-2 bg-white/5 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : detailData?.cast?.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <span className="w-3 h-px bg-red-600 inline-block" />Cast
                    </p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                      {detailData.cast.map((c: any, i: number) => (
                        <div key={i} className="flex-shrink-0 w-[72px] flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5 bg-white/5 ring-1 ring-white/10">
                            <img
                              src={c.profileUrl || SAFE_PLACEHOLDER}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-white leading-tight line-clamp-1 w-full">{c.name}</span>
                          {c.character && (
                            <span className="text-[9px] text-gray-600 leading-tight line-clamp-1 w-full mt-0.5">{c.character}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selected.cast?.length > 0 ? (
                  <CastStrip cast={selected.cast} />
                ) : null}

                {/* Action row */}
                <div className="pt-4 border-t border-white/8 flex items-center gap-3 flex-wrap">
                  {/* Trailer button — opens fullscreen player */}
                  {trailerKey ? (
                    <button
                      onClick={() => setFullscreenTrailer(true)}
                      className="flex items-center gap-2 bg-white text-black text-sm font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-all shadow-lg"
                    >
                      <svg className="w-4 h-4 fill-black flex-shrink-0" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Watch Trailer
                    </button>
                  ) : detailLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-600 animate-pulse">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
                      </svg>
                      Loading trailer…
                    </div>
                  ) : null}
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                    </svg>
                    Not in your Jellyfin library
                  </span>
                </div>

                {/* Similar titles */}
                {detailData?.similar?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <span className="w-3 h-px bg-red-600 inline-block" />More Like This
                    </p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                      {detailData.similar.map((s: any) => (
                        <div
                          key={s.id}
                          className="flex-shrink-0 w-[90px] cursor-pointer group/sim"
                          onClick={() => {
                            setSelected({ ...s, description: null, cast: [], genres: [] });
                          }}
                        >
                          <div className="w-full h-[135px] rounded-lg overflow-hidden bg-white/5 mb-1.5 group-hover/sim:ring-1 group-hover/sim:ring-red-600 transition-all">
                            <img
                              src={s.posterUrl || SAFE_PLACEHOLDER}
                              className="w-full h-full object-cover group-hover/sim:brightness-75 transition-all"
                              onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 truncate group-hover/sim:text-white transition-colors">{s.title}</p>
                          {s.year && <p className="text-[9px] text-gray-700">{s.year}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Fullscreen Trailer Player — rendered via portal to escape app z-index ── */}
      {fullscreenTrailer && trailerKey && selected && createPortal(
        <div
          className="fixed inset-0 bg-black flex flex-col"
          style={{ zIndex: 999999, animation: "dFadeIn 0.2s ease-out" }}
        >
          {/* iframe fills the screen */}
          <iframe
            key={`fs-${trailerKey}`}
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
            allow="autoplay; encrypted-media"
            className="absolute top-1/2 left-1/2"
            style={{
              border: "none",
              width: "177.78vh",
              height: "100vh",
              minWidth: "100%",
              minHeight: "56.25vw",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />

          {/* Gradient overlays — top for controls, bottom for title */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10" />

          {/* Top bar: title left, X close right */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 pt-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-0.5">Trailer</p>
              <h2 className="text-lg font-black text-white leading-tight drop-shadow-lg">{selected.title}</h2>
            </div>
            <button
              onClick={() => setFullscreenTrailer(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white backdrop-blur-sm transition-all hover:scale-110"
              aria-label="Close trailer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      , document.body)}
    </>
  );
}