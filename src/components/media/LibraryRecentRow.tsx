import { useState, useEffect } from "react";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { MediaRow } from "./MediaRow";
import { createJellyfinApi } from "../../lib/jellyfinApi";

// Fetches each library and renders a "New in <LibraryName>" row per library.
// Libraries with no recent additions are silently skipped.

interface LibraryRecentRowsProps {
  authData: any;
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

        // --- NEW CODE START ---
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        // --- NEW CODE END ---

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
        <MediaRow
          key={row.id}
          title={`New in ${row.name}`}
          items={row.items}
          loading={false}
          variant="poster"
          authData={authData}
        />
      ))}
    </>
  );
}