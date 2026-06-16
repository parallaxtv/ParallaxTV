import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { createJellyfinApi } from "../lib/jellyfinApi";

// Import the logo
import logo from "../assets/parallaxtv_logo.svg";

type SortOption = "PremiereDate" | "DateCreated" | "SortName" | "CommunityRating" | "CriticRating";
type FilterType = "All" | "Movie" | "Series";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function img(serverUrl: string, token: string, id: string, type: "Primary" | "Backdrop" | "Logo", w: number) {
  return `${serverUrl}/Items/${id}/Images/${type}?fillWidth=${w}&quality=92&api_key=${token}`;
}

function formatRuntime(ticks?: number) {
  if (!ticks) return null;
  const m = Math.floor(ticks / 600_000_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

// ─── Library Hero ─────────────────────────────────────────────────────────────

function LibraryHero({
  featured, library, authData, onPlay, onInfo,
}: {
  featured: any | null;
  library: any;
  authData: any;
  onPlay: (item: any) => void;
  onInfo: (item: any) => void;
}) {
  const libName = library?.Name ?? "Library";

  // Backdrop: use featured item's backdrop, fall back to library image
  const backdropSrc = featured
    ? img(authData.serverUrl, authData.token, featured.Id, "Backdrop", 1920)
    : library
      ? img(authData.serverUrl, authData.token, library.Id, "Primary", 1920)
      : null;

  const logoSrc = featured?.ImageTags?.Logo
    ? img(authData.serverUrl, authData.token, featured.Id, "Logo", 480)
    : null;

  const genres  = featured?.Genres?.slice(0, 3) ?? [];
  const runtime = formatRuntime(featured?.RunTimeTicks);

  return (
    <div className="relative w-full h-[58vh] min-h-[480px] overflow-hidden bg-[#141414]">

      {/* Backdrop — crossfades when featured changes */}
      <div
        key={featured?.Id ?? "default"}
        className="absolute inset-0"
        style={{ animation: "heroFadeIn 0.6s ease-out both" }}
      >
        {backdropSrc && (
          <img
            src={backdropSrc}
            alt={featured?.Name ?? libName}
            className="w-full h-full object-cover object-top"
          />
        )}
      </div>

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-12 py-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white
            bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full border border-white/10
            hover:border-white/30 transition-all backdrop-blur-sm"
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

      {/* Content — library title when nothing hovered, item info when hovered */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-12 pb-10">
        {!featured ? (
          /* Default: just the library name */
          <div style={{ animation: "slideUp 0.4s ease-out both" }}>
            <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">{libName}</h1>
          </div>
        ) : (
          /* Featured item info */
          <div key={featured.Id} style={{ animation: "slideUp 0.35s ease-out both" }} className="max-w-xl">

            {/* Logo or title */}
            {logoSrc ? (
              <img src={logoSrc} alt={featured.Name}
                className="mb-4 w-auto max-w-[260px] max-h-[80px] object-contain drop-shadow-2xl" />
            ) : (
              <h2 className="text-4xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                {featured.Name}
              </h2>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {featured.CommunityRating && (
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 fill-yellow-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-yellow-400 text-xs font-bold">{featured.CommunityRating.toFixed(1)}</span>
                </div>
              )}
              {featured.ProductionYear && (
                <span className="text-gray-300 text-xs font-semibold">{featured.ProductionYear}</span>
              )}
              {runtime && (
                <span className="text-gray-300 text-xs font-semibold">{runtime}</span>
              )}
              {featured.OfficialRating && (
                <span className="border border-gray-500 text-gray-300 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider">
                  {featured.OfficialRating}
                </span>
              )}
              <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded font-bold tracking-wider uppercase">
                {featured.Type === "Series" ? "TV Show" : "Movie"}
              </span>
            </div>

            {/* Genre pills */}
            {genres.length > 0 && (
              <div className="flex gap-2 mb-4">
                {genres.map((g: string) => (
                  <span key={g} className="text-[11px] text-gray-300 px-3 py-0.5 rounded-full border border-white/15 bg-white/5">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {featured.Overview && (
              <p className="text-gray-300 text-sm leading-relaxed mb-5 line-clamp-2 drop-shadow">
                {featured.Overview}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => onPlay(featured)}
                className="flex items-center gap-2 bg-white text-black font-bold text-sm px-6 py-2.5 rounded-full
                  hover:bg-gray-200 transition-all shadow-lg hover:scale-[1.03] active:scale-100"
              >
                <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play
              </button>
              <button
                onClick={() => onInfo(featured)}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm
                  px-6 py-2.5 rounded-full backdrop-blur-sm border border-white/20 transition-all
                  hover:scale-[1.03] active:scale-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                More Info
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes heroFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── Library Item Card ────────────────────────────────────────────────────────

function LibraryItemCard({
  item, authData, onHover, onHoverEnd, onPlay, onInfo, isActive,
}: {
  item: any;
  authData: any;
  onHover: (item: any) => void;
  onHoverEnd: () => void;
  onPlay: (item: any) => void;
  onInfo: (item: any) => void;
  isActive: boolean;
}) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    // Small delay so fast mouse passes don't trigger the hero update
    hoverTimer.current = setTimeout(() => onHover(item), 300);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    onHoverEnd();
  };

  return (
    <div
      className="cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onInfo(item)}
    >
      {/* Poster */}
      <div className={`relative w-full h-[225px] rounded-xl overflow-hidden bg-[#1c1c1c] mb-2.5 shadow-lg
        transition-all duration-300
        ${isActive ? "scale-[1.05] shadow-2xl shadow-black/60 ring-2 ring-white/40" : "group-hover:scale-[1.03] group-hover:shadow-xl"}`}>

        <img
          src={img(authData.serverUrl, authData.token, item.Id, "Primary", 300)}
          alt={item.Name}
          className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-75"
          onError={(e) => {
            e.currentTarget.src = img(authData.serverUrl, authData.token, item.Id, "Backdrop", 300);
          }}
        />

        {/* Overlay buttons on hover */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2
          opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button
            onClick={e => { e.stopPropagation(); onPlay(item); }}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl
              hover:scale-110 transition-transform"
          >
            <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>

        {/* Rating badge */}
        {item.CommunityRating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[10px] font-bold text-white">{item.CommunityRating.toFixed(1)}</span>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider z-10">
          {item.Type === "Series" ? "Show" : "Film"}
        </div>

        {/* Active glow indicator */}
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-red-500 z-20" />
        )}
      </div>

      <p className={`text-[11px] font-semibold truncate px-0.5 transition-colors leading-snug
        ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
        {item.Name}
      </p>
      {item.ProductionYear && (
        <p className="text-[10px] text-gray-600 px-0.5 mt-0.5">{item.ProductionYear}</p>
      )}
    </div>
  );
}

// ─── Library Page ─────────────────────────────────────────────────────────────

export function Library({ authData }: { authData: any }) {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();
  const location = useLocation();
  const library  = location.state?.library;

  const [items, setItems]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sortBy, setSortBy]       = useState<SortOption>("PremiereDate");
  const [filter, setFilter]       = useState<FilterType>("All");
  const [search, setSearch]       = useState("");
  const [total, setTotal]         = useState(0);
  const [featured, setFeatured]   = useState<any | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const clearTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authData || !id) return;
    setLoading(true);
    async function load() {
      try {
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        const types: any[] = filter === "All" ? ["Movie", "Series"] : filter === "Movie" ? ["Movie"] : ["Series"];
        const res = await itemsApi.getItems({
          userId: authData.userId,
          parentId: id,
          recursive: true,
          includeItemTypes: types,
          sortBy: [sortBy],
          sortOrder: [SortOrder.Descending],
          searchTerm: search || undefined,
          fields: ["Overview", "CommunityRating", "ImageTags", "BackdropImageTags", "ProductionYear", "Genres", "RunTimeTicks", "OfficialRating"] as any,
          limit: 200,
        });
        const fetched = res.data.Items ?? [];
        setItems(fetched);
        setTotal(res.data.TotalRecordCount ?? 0);
        // Auto-feature the first item with a backdrop as the default hero
        const firstWithBackdrop = fetched.find((i: any) => i.BackdropImageTags?.length > 0);
        setFeatured(firstWithBackdrop ?? fetched[0] ?? null);
        setHoveredId(null);
      } catch (err) {
        console.error("Library load failed", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authData, id, sortBy, filter, search]);

  const handleHover = (item: any) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setFeatured(item);
    setHoveredId(item.Id);
  };

  const handleHoverEnd = () => {
    // Keep featured for 1.5s after hover ends so it doesn't flash away
    clearTimer.current = setTimeout(() => {
      setHoveredId(null);
      // Keep the last featured — don't reset to null
    }, 1500);
  };

  const handlePlay = (item: any) => {
    navigate(`/title/${item.Id}`, { state: { item } });
  };

  const handleInfo = (item: any) => {
    navigate(`/title/${item.Id}`, { state: { item } });
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">

      {/* ── Cinematic hero ──────────────────────────────────────────────────── */}
      <LibraryHero
        featured={featured}
        library={library}
        authData={authData}
        onPlay={handlePlay}
        onInfo={handleInfo}
      />

      {/* ── Sticky toolbar ──────────────────────────────────────────────────── */}
      <div className="px-12 py-4 flex flex-wrap items-center gap-3 border-b border-white/5
        sticky top-0 bg-[#141414]/96 backdrop-blur-md z-30">

        {/* Library name + count */}
        <div className="flex items-center gap-3 mr-2">
          <h1 className="text-base font-black text-white tracking-wide">{library?.Name ?? "Library"}</h1>
          {!loading && <span className="text-[11px] text-gray-600">{total.toLocaleString()} titles</span>}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10" />

        {/* Search */}
        <div className="relative min-w-[180px] max-w-xs flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
          </svg>
          <input type="text" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-8 pr-4 py-1.5
              text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-all"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {(["All", "Movie", "Series"] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border
                ${filter === f
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"}`}>
              {f === "All" ? "All" : f === "Movie" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
          className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-full px-4 py-1.5
            focus:outline-none focus:border-white/30 cursor-pointer appearance-none pr-8 ml-auto"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
          }}>
          <option value="PremiereDate">Latest Release</option>
          <option value="DateCreated">Recently Added</option>
          <option value="SortName">A → Z</option>
          <option value="CommunityRating">Top Rated</option>
          <option value="CriticRating">Critic Rating</option>
        </select>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      <div className="px-12 py-8 pb-24">
        {loading ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i}>
                <div className="w-full h-[225px] rounded-xl bg-white/5 animate-pulse mb-2.5" />
                <div className="h-2.5 w-3/4 bg-white/5 rounded animate-pulse mb-1.5" />
                <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-gray-500 text-lg font-semibold mb-2">Nothing found</p>
            <p className="text-gray-700 text-sm">Try a different filter or search term</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {items.map(item => (
              <LibraryItemCard
                key={item.Id}
                item={item}
                authData={authData}
                onHover={handleHover}
                onHoverEnd={handleHoverEnd}
                isActive={hoveredId === item.Id}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
