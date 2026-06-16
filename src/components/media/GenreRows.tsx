import { useState, useEffect, useRef } from "react";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { MediaRow } from "./MediaRow";
import { createJellyfinApi } from "../../lib/jellyfinApi";

// ─── Config ───────────────────────────────────────────────────────────────────

// Genres to always skip — too broad or not useful as a row
const SKIP_GENRES = new Set([
  "Unknown", "Foreign", "Short", "News", "Talk Show",
  "Game Show", "Home and Garden",
]);

// Max genre chips to show so the dashboard stays scannable
const MAX_GENRES = 24;

// Min items a genre needs to get its own row
const MIN_ITEMS = 3;

// ─── GenreRows ────────────────────────────────────────────────────────────────

export function GenreRows({ authData }: { authData: any }) {
  const [genreRows, setGenreRows] = useState<{ genre: string; items: any[] }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [loading, setLoading]     = useState(true);
  const hasFetched                = useRef(false);
  const chipScrollRef             = useRef<HTMLDivElement>(null);

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
        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

        // 1. Fetch a broad pool with genre info — no limit on genres, 300 items
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

        // 2. Count items per genre
        const genreCount: Record<string, number> = {};
        pool.forEach((item: any) => {
          (item.Genres ?? []).forEach((g: string) => {
            if (!SKIP_GENRES.has(g)) genreCount[g] = (genreCount[g] ?? 0) + 1;
          });
        });

        // 3. Sort genres by item count, take top genres with enough items
        const topGenres = Object.entries(genreCount)
          .filter(([, count]) => count >= MIN_ITEMS)
          .sort((a, b) => b[1] - a[1])
          .slice(0, MAX_GENRES)
          .map(([genre]) => genre);

        if (topGenres.length === 0) { setLoading(false); return; }

        // 4. Fetch items per genre in parallel (top rated per genre)
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
    <div className="mb-10" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-red-600 inline-block" />
          Browse by Genre
        </h2>
        <span className="text-[11px] text-gray-600 font-medium">
          {selectedRow.items.length} title{selectedRow.items.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative group">
        <button
          onClick={() => scrollChips("left")}
          aria-label="Scroll genres left"
          className="absolute left-0 top-0 bottom-4 z-10 flex items-center px-1.5 bg-gradient-to-r from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
            ‹
          </span>
        </button>

        <div ref={chipScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
          {genreRows.map(({ genre, items }) => {
            const isSelected = genre === selectedRow.genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-white text-black border-white shadow-lg"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/25"
                }`}
              >
                {genre}
                <span className={`ml-2 font-semibold ${isSelected ? "text-black/50" : "text-gray-600"}`}>
                  {items.length}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollChips("right")}
          aria-label="Scroll genres right"
          className="absolute right-0 top-0 bottom-4 z-10 flex items-center px-1.5 bg-gradient-to-l from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
            ›
          </span>
        </button>
      </div>

      <MediaRow
        key={selectedRow.genre}
        title={selectedRow.genre}
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