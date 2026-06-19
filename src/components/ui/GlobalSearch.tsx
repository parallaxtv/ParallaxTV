import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../../lib/jellyfinApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function imgUrl(serverUrl: string, token: string, id: string, type: "Primary" | "Backdrop", w: number) {
  return `${serverUrl}/Items/${id}/Images/${type}?fillWidth=${w}&quality=88&api_key=${token}`;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ item, authData, onSelect }: { item: any; authData: any; onSelect: () => void }) {
  const navigate = useNavigate();

  const thumb = item.BackdropImageTags?.length
    ? imgUrl(authData.serverUrl, authData.token, item.Id, "Backdrop", 320)
    : imgUrl(authData.serverUrl, authData.token, item.Id, "Primary", 160);

  const handleClick = () => {
    onSelect();
    navigate(`/title/${item.Id}`, { state: { item } });
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer
        transition-colors group"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden bg-[#1e1e1e]">
        <img
          src={thumb}
          alt={item.Name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.style.opacity = "0"; }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate group-hover:text-white transition-colors">
          {item.Name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-gray-500 text-[11px]">
            {item.Type === "Series" ? "TV Show" : item.Type === "Movie" ? "Movie" : item.Type}
          </span>
          {item.ProductionYear && (
            <span className="text-gray-600 text-[11px]">· {item.ProductionYear}</span>
          )}
          {item.CommunityRating && (
            <span className="flex items-center gap-0.5 text-[11px] text-yellow-500">
              · ★ {item.CommunityRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Genre pills */}
      {item.Genres?.length > 0 && (
        <div className="hidden sm:flex gap-1.5 flex-shrink-0">
          {item.Genres.slice(0, 2).map((g: string) => (
            <span key={g} className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full border border-white/8 bg-white/3">
              {g}
            </span>
          ))}
        </div>
      )}

      <svg className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:text-gray-400 transition-colors"
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </div>
  );
}

// ─── GlobalSearch ─────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  authData: any;
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ authData, open, onClose }: GlobalSearchProps) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Debounced search
  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setResults([]); setLoading(false); return; }
      setLoading(true);
      try {
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        const res = await itemsApi.getItems({
          userId: authData.userId,
          searchTerm: q,
          recursive: true,
          includeItemTypes: ["Movie", "Series"],
          limit: 12,
          fields: ["Overview", "CommunityRating", "Genres", "ImageTags",
                   "BackdropImageTags", "ProductionYear"] as any,
        });
        setResults(res.data.Items ?? []);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 320),
    [authData]
  );

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  if (!open) return null;

  const showEmpty  = !loading && query.trim().length > 0 && results.length === 0;
  const showHint   = !loading && query.trim().length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 0.18s ease-out both" }}
      />

      {/* Search panel — centered, full width */}
      <div
        className="fixed inset-x-0 top-0 z-[101] flex justify-center px-6 pt-[7vh]"
        style={{ animation: "searchSlideIn 0.22s ease-out both" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-full max-w-3xl rounded-2xl overflow-hidden"
          style={{
            background: "rgba(15,15,15,0.97)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(28px)",
            boxShadow: "0 40px_100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Input row */}
          <div className="flex items-center gap-4 px-6 py-5">
            <div className="flex-shrink-0">
              {loading ? (
                <svg className="w-5 h-5 text-red-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search movies, shows, anime…"
              className="flex-1 bg-transparent text-white text-lg placeholder-gray-600
                focus:outline-none caret-red-500 font-medium"
            />

            {query && (
              <button onClick={() => setQuery("")}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full
                  bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}

            <kbd className="flex-shrink-0 text-[11px] text-gray-600 border border-white/10
              px-2.5 py-1 rounded-lg font-mono">
              ESC
            </kbd>
          </div>

          {/* Divider */}
          <div className="h-px mx-6" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Results area */}
          <div className="max-h-[55vh] overflow-y-auto overscroll-contain">

            {showHint && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm font-semibold">Search your entire library</p>
                  <p className="text-gray-600 text-xs mt-1">Movies, TV shows, anime and more</p>
                </div>
              </div>
            )}

            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm font-semibold">No results for "{query}"</p>
                  <p className="text-gray-600 text-xs mt-1">Try a different spelling or title</p>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-3 px-3">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.15em] px-3 pb-2">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
                {results.map(item => (
                  <ResultCard key={item.Id} item={item} authData={authData} onSelect={onClose} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes searchSlideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
