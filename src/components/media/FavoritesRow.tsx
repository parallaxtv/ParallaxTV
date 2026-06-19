// components/media/FavoritesRow.tsx
import { useEffect, useState, useCallback } from "react";
import { AuthData } from "../../types/auth";
import { getFavorites } from "../../services/jellyfin/favorites";
import { MediaRow } from "./MediaRow";

interface FavoritesRowProps {
  authData: AuthData;
  refreshKey?: number;
}

export function FavoritesRow({ authData, refreshKey = 0 }: FavoritesRowProps) {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authData) return;
    setLoading(true);
    try {
      const data = await getFavorites(authData);
      setItems(data);
    } catch (err) {
      console.error("[FavoritesRow] fetch failed:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authData]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Hide the row entirely when not loading and nothing is favorited
  if (!loading && items.length === 0) return null;

  return (
    <MediaRow
      title="Favorites ❤️"
      items={items}
      loading={loading}
      variant="poster"
      authData={authData}
    />
  );
}