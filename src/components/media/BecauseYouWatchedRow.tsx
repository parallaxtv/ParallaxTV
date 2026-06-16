import { useState, useEffect } from "react";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { MediaRow } from "./MediaRow";
import { createJellyfinApi } from "../../lib/jellyfinApi";

export function BecauseYouWatchedRow({ authData, refreshKey }: { authData: any; refreshKey?: number }) {
  const [sourceItem, setSourceItem] = useState<any>(null);
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!authData) return;
    setLoading(true);

    async function fetchBecauseYouWatched() {
      try {
        const api = createJellyfinApi(
            authData.serverUrl,
            authData.token
        );
        
        const itemsApi = getItemsApi(api);

        // 1. Fetch a pool of the user's recently watched items (up to 20)
        const historyRes = await itemsApi.getItems({
          userId: authData.userId,
          sortBy: ["DatePlayed"],
          sortOrder: [SortOrder.Descending],
          includeItemTypes: ["Movie", "Series"],
          recursive: true,
          limit: 20, // Grab a larger pool instead of just the last 1
          fields: ["GenreItems"] as any,
        });

        const recentItems = historyRes.data.Items ?? [];

        // If the user hasn't watched anything yet, just bail out
        if (recentItems.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Pick a RANDOM item from their recent history!
        const randomIndex = Math.floor(Math.random() * recentItems.length);
        const randomWatched = recentItems[randomIndex];

        setSourceItem(randomWatched);

        // 3. Fetch "More Like This" based on the randomly selected item's genres
        const genreIds = randomWatched.GenreItems?.map((g: any) => g.Id) ?? [];
        
        const relatedRes = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: [randomWatched.Type === "Series" ? "Series" : "Movie"],
          recursive: true,
          sortBy: ["CommunityRating"], // Recommend the best-rated similar items
          sortOrder: ["Descending"],
          limit: 20,
          genreIds: genreIds.length > 0 ? genreIds : undefined,
          fields: ["CommunityRating", "ImageTags", "ProductionYear"] as any,
        });

        // 4. Filter out the original item so we don't recommend the exact thing they watched
        const filtered = (relatedRes.data.Items ?? []).filter((i: any) => i.Id !== randomWatched.Id);
        
        setItems(filtered.slice(0, 15));
      } catch (err) {
        console.error("Because You Watched failed", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBecauseYouWatched();
  }, [authData, refreshKey]);

  // If loading is done and we found no similar items (or haven't watched anything), hide the row completely.
  if (!loading && items.length === 0) return null;

  return (
    <MediaRow
      title={sourceItem ? `Because you watched ${sourceItem.Name}` : "Recommendations"}
      items={items}
      loading={loading}
      variant="poster"
      authData={authData}
    />
  );
}