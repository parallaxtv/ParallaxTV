// src/hooks/useFavorite.ts
import { useState, useCallback } from "react";
import { AuthData } from "../types/auth";
import { toggleFavorite } from "../services/jellyfin/favorites";

interface UseFavoriteOptions {
  itemId: string | undefined;
  initialState: boolean;
  authData: AuthData;
  onToggle?: (newState: boolean) => void;
}

export function useFavorite({ itemId, initialState, authData, onToggle }: UseFavoriteOptions) {
  const [isFavorite, setIsFavorite] = useState(initialState);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!itemId || isPending) return;

      // Optimistic update
      const next = !isFavorite;
      setIsFavorite(next);
      setIsPending(true);

      try {
        await toggleFavorite(authData, itemId, isFavorite);
        onToggle?.(next);
      } catch (err) {
        // Rollback on failure
        setIsFavorite(isFavorite);
        console.error("[useFavorite] toggle failed:", err);
      } finally {
        setIsPending(false);
      }
    },
    [itemId, isFavorite, isPending, authData, onToggle]
  );

  return { isFavorite, isPending, handleToggle };
}