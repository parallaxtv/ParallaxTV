// src/services/jellyfin/favorites.ts
import { AuthData } from "../../types/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

function headers(authData: AuthData) {
  return {
    "X-Emby-Token": authData.token,
    "Content-Type": "application/json",
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function addFavorite(authData: AuthData, itemId: string): Promise<void> {
  const res = await fetch(
    `${authData.serverUrl}/Users/${authData.userId}/FavoriteItems/${itemId}`,
    { method: "POST", headers: headers(authData) }
  );
  if (!res.ok) throw new Error(`addFavorite failed: ${res.status}`);
}

export async function removeFavorite(authData: AuthData, itemId: string): Promise<void> {
  const res = await fetch(
    `${authData.serverUrl}/Users/${authData.userId}/FavoriteItems/${itemId}`,
    { method: "DELETE", headers: headers(authData) }
  );
  if (!res.ok) throw new Error(`removeFavorite failed: ${res.status}`);
}

export async function toggleFavorite(
  authData: AuthData,
  itemId: string,
  currentState: boolean
): Promise<boolean> {
  if (currentState) {
    await removeFavorite(authData, itemId);
    return false;
  } else {
    await addFavorite(authData, itemId);
    return true;
  }
}

export async function getFavorites(authData: AuthData): Promise<any[]> {
  const params = new URLSearchParams({
    Filters: "IsFavorite",
    Recursive: "true",
    IncludeItemTypes: "Movie,Series",
    Fields: "Overview,Genres,ProviderIds,UserData,PrimaryImageAspectRatio,CommunityRating",
    SortBy: "DateCreated",
    SortOrder: "Descending",
    Limit: "100",
  });

  const res = await fetch(
    `${authData.serverUrl}/Users/${authData.userId}/Items?${params}`,
    { headers: headers(authData) }
  );

  if (!res.ok) throw new Error(`getFavorites failed: ${res.status}`);
  const data = await res.json();
  return data.Items ?? [];
}