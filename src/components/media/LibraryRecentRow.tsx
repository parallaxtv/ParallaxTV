import { useState, useEffect } from "react";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { MediaRow } from "./MediaRow";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { AuthData } from "../../types/auth";

// Fetches each library and renders a "New in <LibraryName>" row per library.
// Libraries with no recent additions are silently skipped.

interface LibraryRecentRowsProps {
  authData: AuthData;
  // How many days counts as "recent". Default 60.
  recentDays?: number;
}

interface LibraryWithItems {
  id: string;
  name: string;
  items: any[];
}

export function LibraryRecentRows({ authData, recentDays = 60 }: LibraryRecentRowsProps) {
  const [rows, setRows]       = useState<LibraryWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authData) return;
    async function load() {
      try {
        // 1. Fetch all library views
        const viewsRes = await fetch(
          `${authData.serverUrl}/Users/${authData.userId}/Views?api_key=${authData.token}`
        );
        const viewsData = await viewsRes.json();
        const libraries = (viewsData.Items ?? []).filter((l: any) =>
          !["livetv", "channels", "music", "playlists", "boxsets"].includes(
            l.CollectionType?.toLowerCase() ?? ""
          )
        );

        if (libraries.length === 0) { setLoading(false); return; }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - recentDays);

        // 2. Fetch recently added for each library in parallel
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);

        const results = await Promise.all(
          libraries.map(async (lib: any) => {
            try {
              const res = await itemsApi.getItems({
                userId: authData.userId,
                parentId: lib.Id,
                recursive: true,
                includeItemTypes: ["Movie", "Series"],
                sortBy: ["DateCreated"],
                sortOrder: [SortOrder.Descending],
                // Use minDateLastSavedForUser — correct Jellyfin SDK field
                // minDateLastSaved causes 500 errors on some Jellyfin versions
                minDateLastSavedForUser: cutoff.toISOString(),
                fields: ["CommunityRating", "ImageTags", "ProductionYear", "DateCreated"] as any,
                limit: 20,
              });
              return {
                id: lib.Id,
                name: lib.Name,
                items: res.data.Items ?? [],
              } as LibraryWithItems;
            } catch {
              return { id: lib.Id, name: lib.Name, items: [] } as LibraryWithItems;
            }
          })
        );

        // Only keep libraries that have at least 1 recent item
        setRows(results.filter(r => r.items.length > 0));
      } catch (err) {
        console.error("LibraryRecentRows failed", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authData, recentDays]);

  if (loading || rows.length === 0) return null;

  return (
    <>
      {rows.map(row => (
        <div key={row.id} className="mb-10 relative group/row" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
          
          {/* ── Sub-section Header (Discovery Style) ── */}
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
              <span className="w-3 h-px bg-[var(--color-accent)] inline-block shadow-[0_0_8px_var(--color-accent-glow)]" />
              New in {row.name}
            </h2>
          </div>

          <MediaRow
            title=""
            hideHeader // Hides the old default header inside MediaRow
            items={row.items}
            loading={false}
            variant="poster"
            authData={authData}
          />
        </div>
      ))}
    </>
  );
}