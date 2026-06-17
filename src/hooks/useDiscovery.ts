import { useState, useEffect, useCallback } from "react";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../lib/jellyfinApi";
import { AuthData } from "../types/auth";
import { MediaItem } from "../types/media";
import { DiscoveryItem } from "../types/discovery";
import { fetchDiscoveryItems } from "../services/discovery/discoveryService";
import { normalizeTitle } from "../utils/titles";

export function useDiscovery(type: "anime" | "kdrama" | "movies" | "seasonal", authData: AuthData) {
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [libraryDict, setLibraryDict] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Jellyfin Library for cross-referencing
  useEffect(() => {
    if (!authData) return;
    async function fetchLib() {
      try {
        const baseApi = createJellyfinApi(authData.serverUrl, authData.token);
        const api = getItemsApi(baseApi);
        const res = await api.getItems({
          userId: authData.userId,
          recursive: true,
          includeItemTypes: ["Movie", "Series"],
          fields: ["ProductionYear", "OriginalTitle"] as any,
        });
        setLibraryDict((res.data.Items as MediaItem[]) || []);
      } catch (err) {
        console.error("useDiscovery: library fetch failed", err);
      }
    }
    fetchLib();
  }, [authData]);

  // Fetch Worker API Items
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchDiscoveryItems(type);
      setItems(data);
      setLoading(false);
    }
    loadData();
  }, [type]);

  // Library Matcher (Memoized for performance)
  const getLibraryMatch = useCallback((item: DiscoveryItem) => {
    const n1 = normalizeTitle(item.title);
    const n2 = normalizeTitle(item.altTitle || "");
    
    return libraryDict.find((lib) => {
      const libNorm  = normalizeTitle(lib.Name || "");
      const origNorm = normalizeTitle(lib.OriginalTitle || "");
      const match = libNorm === n1 || (n2 && libNorm === n2) || origNorm === n1;
      
      if (!match) return false;
      if (item.year && lib.ProductionYear) return Math.abs(item.year - lib.ProductionYear) <= 1;
      return true;
    });
  }, [libraryDict]);

  return { items, loading, getLibraryMatch };
}