import { useState, useEffect, useRef } from "react";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { MediaRow } from "./MediaRow";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { AuthData } from "../../types/auth";

// ─── Config ───────────────────────────────────────────────────────────────────
const SKIP_GENRES = new Set(["Unknown", "Foreign", "Short", "News", "Talk Show", "Game Show", "Home and Garden"]);
const MAX_GENRES = 24;
const MIN_ITEMS = 3;

export function GenreRows({ authData }: { authData: AuthData }) {
  const [genreRows, setGenreRows] = useState<{ genre: string; items: any[] }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const chipScrollRef = useRef<HTMLDivElement>(null);

  const scrollChips = (dir: "left" | "right") => {
    const el = chipScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  useEffect(() => {
    if (!authData || hasFetched.current) return;
    hasFetched.current = true;

    async function load() {
      try {
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        
        const poolRes = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: ["Movie", "Series"],
          recursive: true,
          sortBy: ["CommunityRating"],
          sortOrder: [SortOrder.Descending],
          fields: ["Genres", "CommunityRating", "ImageTags", "ProductionYear"] as any,
          limit: 300,
        });

        const pool = poolRes.data.Items ?? [];
        if (pool.length === 0) { setLoading(false); return; }

        const genreCount: Record<string, number> = {};
        pool.forEach((item: any) => {
          (item.Genres ?? []).forEach((g: string) => {
            if (!SKIP_GENRES.has(g)) genreCount[g] = (genreCount[g] ?? 0) + 1;
          });
        });

        const topGenres = Object.entries(genreCount)
          .filter(([, count]) => count >= MIN_ITEMS)
          .sort((a, b) => b[1] - a[1])
          .slice(0, MAX_GENRES)
          .map(([genre]) => genre);

        if (topGenres.length === 0) { setLoading(false); return; }

        const rows = await Promise.all(
          topGenres.map(async (genre) => {
            try {
              const res = await itemsApi.getItems({
                userId: authData.userId,
                includeItemTypes: ["Movie", "Series"],
                recursive: true,
                genres: [genre],
                sortBy: ["CommunityRating"],
                sortOrder: [SortOrder.Descending],
                fields: ["CommunityRating", "ImageTags", "ProductionYear"] as any,
                limit: 20,
              });
              return { genre, items: res.data.Items ?? [] };
            } catch {
              return { genre, items: [] };
            }
          })
        );

        const visibleRows = rows.filter(r => r.items.length >= MIN_ITEMS);
        setGenreRows(visibleRows);
        setSelectedGenre((current) => current || visibleRows[0]?.genre || "");
      } catch (err) {
        console.error("GenreRows failed", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authData]);

  if (loading || genreRows.length === 0) return null;

  const selectedRow = genreRows.find((row) => row.genre === selectedGenre) ?? genreRows[0];

  return (
    <div className="mb-10 relative group/row" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
      
      {/* ── Header ── */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
          Browse by Genre
        </h2>
      </div>

      {/* ── Chips Container ── */}
      <div className="relative mb-6">
        <button
          onClick={() => scrollChips("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all opacity-0 group-hover/row:opacity-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div ref={chipScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-2">
          {genreRows.map(({ genre, items }) => {
            const isSelected = genre === selectedRow.genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`flex-shrink-0 rounded-full border px-5 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[#071017] shadow-[0_0_15px_var(--color-accent-glow)]"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/25"
                }`}
              >
                {genre}
                <span className={`ml-2 ${isSelected ? "text-black/60" : "text-gray-600"}`}>
                  {items.length}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollChips("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[#1A1A24]/90 hover:bg-[#1A1A24] border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all opacity-0 group-hover/row:opacity-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <MediaRow
        key={selectedRow.genre}
        title=""
        hideHeader
        items={selectedRow.items}
        loading={false}
        variant="poster"
        authData={authData}
      />

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