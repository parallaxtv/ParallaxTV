import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../../lib/jellyfinApi";

export interface AuthData {
  userId: string;
  serverUrl: string;
  token: string;
}

// Upgraded to accept itemTypes and limit so it's fully reusable!
export async function getLatestMedia(
  authData: AuthData, 
  itemTypes: ("Movie" | "Series")[] = ["Movie", "Series"],
  limit: number = 30
) {
  const api = createJellyfinApi(authData.serverUrl, authData.token);
  const itemsApi = getItemsApi(api);

  const res = await itemsApi.getItems({
    userId: authData.userId,
    recursive: true,
    includeItemTypes: itemTypes,
    sortBy: ["DateCreated"],
    sortOrder: ["Descending"] as any,
    fields: ["CommunityRating", "ImageTags", "ProductionYear"] as any,
    limit: limit,
  });

  return res.data.Items ?? [];
}

export async function getContinueWatching(authData: AuthData) {
  const api = createJellyfinApi(authData.serverUrl, authData.token);
  const itemsApi = getItemsApi(api);

  const res = await itemsApi.getResumeItems({
    userId: authData.userId,
    limit: 20,
    imageTypes: ["Primary"],
  });

  return res.data.Items ?? [];
}

export async function getItemDetails(authData: AuthData, itemId: string) {
  const api = createJellyfinApi(authData.serverUrl, authData.token);
  const itemsApi = getItemsApi(api);

  const res = await itemsApi.getItems({
    userId: authData.userId,
    ids: [itemId],
    fields: ["Overview", "Genres", "People", "Studios", "MediaStreams"] as any,
  });

  return res.data.Items?.[0] ?? null;
}