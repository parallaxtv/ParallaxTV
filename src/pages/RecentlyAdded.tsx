import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { createJellyfinApi } from "../lib/jellyfinApi";
import { Sidebar, Icons } from "../components/ui/Sidebar";
import { AuthData } from "../types/auth";

type SortOption = "DateCreated" | "PremiereDate" | "SortName" | "CommunityRating";
type FilterType = "All" | "Movie" | "Series";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function img(serverUrl: string, token: string, id: string, type: "Primary" | "Backdrop", w: number) {
  return `${serverUrl}/Items/${id}/Images/${type}?fillWidth=${w}&quality=92&api_key=${token}`;
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function GridItemCard({ item, authData, onSelect }: { item: any; authData: AuthData; onSelect: (item: any) => void }) {
  return (
    <div className="cursor-pointer group" onClick={() => onSelect(item)}>
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-white/5 mb-3 shadow-lg transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-xl">
        <img
          src={img(authData.serverUrl, authData.token, item.Id, "Primary", 400)}
          alt={item.Name}
          className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-75"
          onError={(e) => { e.currentTarget.src = img(authData.serverUrl, authData.token, item.Id, "Backdrop", 400); }}
        />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 bg-black/20 pointer-events-none">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center shadow-2xl">
            <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>

        {item.CommunityRating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md z-10">
            <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-[10px] font-bold text-white/90">{item.CommunityRating.toFixed(1)}</span>
          </div>
        )}

        <div className="absolute top-2 right-2 bg-black/50 border border-white/10 backdrop-blur-md text-white/80 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider z-10">
          {item.Type === "Series" ? "Show" : "Film"}
        </div>
      </div>

      <p className="text-[12px] font-semibold truncate px-1 text-white/70 group-hover:text-white transition-colors leading-snug">
        {item.Name}
      </p>
      {item.ProductionYear && (
        <p className="text-[11px] text-white/40 px-1 mt-0.5 font-medium">{item.ProductionYear}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RecentlyAdded({ authData, onLogout }: { authData: AuthData; onLogout: () => void }) {
  const navigate = useNavigate();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("DateCreated");
  const [filter, setFilter] = useState<FilterType>("All");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    if (!authData) return;
    setLoading(true);

    async function load() {
      try {
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);

        const types: any[] = filter === "All" ? ["Movie", "Series"] : [filter];
        const res = await itemsApi.getItems({
          userId: authData.userId,
          recursive: true,
          includeItemTypes: types,
          sortBy: [sortBy],
          sortOrder: [SortOrder.Descending],
          searchTerm: debouncedSearch || undefined,
          fields: ["CommunityRating", "ImageTags", "ProductionYear"] as any,
          limit: 200,
        });

        setItems(res.data.Items ?? []);
        setTotal(res.data.TotalRecordCount ?? 0);
      } catch (err) {
        console.error("Recently Added load failed", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authData, sortBy, filter, debouncedSearch]);

  const handleSelect = (item: any) => navigate(`/title/${item.Id}`, { state: { item } });

  return (
    <div className="relative flex h-screen text-white overflow-hidden bg-[#0B0B0F]">
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 xl:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <Sidebar authData={authData} onLogout={onLogout} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <main className="flex-1 flex flex-col relative h-screen overflow-y-auto scrollbar-hide">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="xl:hidden absolute top-6 left-6 z-30 p-2 text-white/80 hover:text-white bg-black/40 rounded-lg backdrop-blur-md border border-white/10"
          aria-label="Open menu"
        >
          <Icons.Menu />
        </button>

        {/* ── Sticky toolbar ── */}
        <div className="px-12 pt-14 pb-5 flex flex-wrap items-center gap-4 border-b border-white/5
          sticky top-0 bg-[#0B0B0F]/80 backdrop-blur-2xl z-30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all">

          <div className="flex items-center gap-3 mr-2">
            <h1 className="text-lg font-black text-white/90 tracking-wide drop-shadow-sm">Recently Added</h1>
            {!loading && <span className="text-[12px] font-medium text-white/40">{total.toLocaleString()} titles</span>}
          </div>

          <div className="w-px h-5 bg-white/10 hidden sm:block" />

          <div className="relative min-w-[200px] max-w-xs flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search recently added…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 rounded-full pl-10 pr-4 py-2
                text-sm text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-accent)] focus:bg-white/10 transition-all shadow-lg"
            />
          </div>

          <div className="flex gap-2">
            {(["All", "Movie", "Series"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all border
                  ${filter === f
                    ? "bg-[var(--color-accent)] text-[#071017] border-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent-glow)]"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/25"}`}>
                {f === "All" ? "All" : f === "Movie" ? "Movies" : "TV Shows"}
              </button>
            ))}
          </div>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 text-white/80 font-medium text-xs rounded-full px-4 py-2
              focus:outline-none focus:border-[var(--color-accent)] cursor-pointer appearance-none pr-9 ml-auto transition-all shadow-lg"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
            }}>
            <option value="DateCreated" className="bg-[#1a1a1a] text-white">Recently Added</option>
            <option value="PremiereDate" className="bg-[#1a1a1a] text-white">Latest Release</option>
            <option value="SortName" className="bg-[#1a1a1a] text-white">A → Z</option>
            <option value="CommunityRating" className="bg-[#1a1a1a] text-white">Top Rated</option>
          </select>
        </div>

        {/* ── Grid ── */}
        <div className="px-12 py-8 pb-24">
          {loading ? (
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i}>
                  <div className="w-full aspect-[2/3] rounded-xl bg-white/5 animate-pulse mb-3 border border-white/5" />
                  <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
                  <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <svg className="w-16 h-16 text-white/20 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white/60 text-lg font-bold mb-2 tracking-wide">Nothing found</p>
              <p className="text-white/40 text-sm font-medium">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {items.map((item) => (
                <GridItemCard key={item.Id} item={item} authData={authData} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}