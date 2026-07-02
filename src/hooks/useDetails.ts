// hooks/useDetails.ts
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../lib/jellyfinApi";

const API = "https://parallax-api.parallaxtv-api.workers.dev";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normTitle(t: string) {
  if (!t) return "";
  return t.toLowerCase().replace(/^(the |a |an )/i, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function fetchAniListCast(titleEn: string, titleRo: string, year?: number): Promise<any[] | null> {
  try {
    const res  = await fetch(`${API}/api/anime/search?q=${encodeURIComponent(titleEn || titleRo)}`);
    const data = await res.json();
    if (!data.success) return null;

    const results: any[] = data.data ?? [];
    const n1 = normTitle(titleEn), n2 = normTitle(titleRo);
    const match = results.find((m: any) => {
      const t1 = normTitle(m.title    || "");
      const t2 = normTitle(m.altTitle || "");
      const nameMatch = t1 === n1 || t2 === n1 || t1 === n2 || t2 === n2;
      if (!nameMatch) return false;
      if (year && m.year) return Math.abs(year - m.year) <= 1;
      return true;
    }) ?? results[0];

    if (!match) return null;
    if (match.cast?.length > 0) {
      return match.cast.map((c: any) => ({
        charName:   c.charName   ?? c.character?.name ?? "Unknown",
        charImage:  c.charImage  ?? null,
        actorName:  c.actorName  ?? null,
        actorImage: c.actorImage ?? null,
      }));
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDetails(routeItemId: string | undefined, authData: any, initialItem?: any) {
  const navigate = useNavigate();

  const [item, setItem]                         = useState<any>(initialItem ?? null);
  const [seasons, setSeasons]                   = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [episodes, setEpisodes]                 = useState<any[]>([]);
  const [nextUp, setNextUp]                     = useState<any>(null);
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);
  const [moreLikeThis, setMoreLikeThis]         = useState<any[]>([]);
  const [anilistCast, setAnilistCast]           = useState<any[] | null>(null);
  const [anilistLoading, setAnilistLoading]     = useState(false);
  const [refreshTrigger, setRefreshTrigger]     = useState(0);
  const [nextUpLoaded, setNextUpLoaded]         = useState(false);

  // ── Reset all state when the route changes ──────────────────────────────────
  useEffect(() => {
    setItem(initialItem?.Id === routeItemId ? initialItem : routeItemId ? { Id: routeItemId } : null);
    setSeasons([]);
    setSelectedSeasonId("");
    setEpisodes([]);
    setNextUp(null);
    setNextUpLoaded(false);
    setMoreLikeThis([]);
    setAnilistCast(null);
  }, [routeItemId, initialItem]);

  // 1. Fresh item data
  useEffect(() => {
    if (!routeItemId || !authData) return;
    async function fetchFreshItem() {
      try {
        const fields = "Overview,CommunityRating,Genres,GenreItems,People,RunTimeTicks,OfficialRating,ImageTags,BackdropImageTags,UserData,ProviderIds,RemoteTrailers";
        const res  = await fetch(`${authData.serverUrl}/Users/${authData.userId}/Items/${routeItemId}?fields=${fields}&api_key=${authData.token}`);
        const data = await res.json();
        // If we landed on an episode, redirect to its series
        if (data.Type === "Episode" && data.SeriesId) {
          const seriesRes  = await fetch(`${authData.serverUrl}/Users/${authData.userId}/Items/${data.SeriesId}?fields=${fields}&api_key=${authData.token}`);
          const seriesData = await seriesRes.json();
          setItem(seriesData);
          navigate(`/title/${data.SeriesId}`, { state: { item: seriesData }, replace: true });
          return;
        }
        setItem(data);
      } catch (err) {
        console.error("Failed to fetch fresh item data", err);
      }
    }
    fetchFreshItem();
  }, [routeItemId, authData, refreshTrigger]);

  // 2. NextUp for Series
  useEffect(() => {
    if (item?.Type !== "Series" || !authData) {
      setNextUpLoaded(true);
      return;
    }
    async function fetchNextUp() {
      try {
        const res  = await fetch(`${authData.serverUrl}/Shows/NextUp?userId=${authData.userId}&seriesId=${item.Id}&api_key=${authData.token}`);
        const data = await res.json();
        setNextUp(data.Items?.length > 0 ? data.Items[0] : null);
      } catch (err) {
        console.error("Failed to fetch NextUp", err);
      } finally {
        setNextUpLoaded(true);
      }
    }
    fetchNextUp();
  }, [item?.Id, authData, refreshTrigger]);

  // 3. Seasons
  useEffect(() => {
    if (item?.Type !== "Series" || !authData) return;
    async function fetchSeasons() {
      try {
        const api      = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        const res = await itemsApi.getItems({
          userId: authData.userId,
          parentId: item.Id,
          includeItemTypes: ["Season"],
          sortBy: ["SortName"],
          fields: ["UserData"] as any,
        });
        const seasonItems = res.data.Items ?? [];
        if (seasonItems.length > 0) {
          setSeasons(seasonItems);
          if (!selectedSeasonId && nextUpLoaded) {
            setSelectedSeasonId(nextUp?.SeasonId ?? seasonItems[0].Id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch seasons", err);
      }
    }
    fetchSeasons();
  }, [item?.Id, authData, refreshTrigger]);

  // Auto-select season once nextUp is resolved
  useEffect(() => {
    if (nextUpLoaded && seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(nextUp?.SeasonId ?? seasons[0].Id);
    }
  }, [nextUpLoaded, seasons, nextUp, selectedSeasonId]);

  // 4. Episodes
  useEffect(() => {
    if (!selectedSeasonId || !authData) return;
    const isBackgroundSync = episodes.length > 0 && episodes[0]?.SeasonId === selectedSeasonId;
    if (!isBackgroundSync) setIsEpisodesLoading(true);

    async function fetchEpisodes() {
      try {
        const api      = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        const res = await itemsApi.getItems({
          userId: authData.userId,
          parentId: selectedSeasonId,
          includeItemTypes: ["Episode"],
          fields: ["Overview", "CommunityRating", "UserData"] as any,
          sortBy: ["IndexNumber"],
          imageTypes: ["Primary"],
        } as any);
        if (res.data.Items) setEpisodes(res.data.Items);
      } catch (err) {
        console.error("Failed to fetch episodes", err);
      } finally {
        setIsEpisodesLoading(false);
      }
    }
    fetchEpisodes();
  }, [selectedSeasonId, authData, refreshTrigger]);

  // 5. More Like This
  useEffect(() => {
    if (!item || !authData) return;
    async function fetchMoreLikeThis() {
      try {
        const api      = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        const genreIds = item.GenreItems?.map((g: any) => g.Id) ?? [];
        const res = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: [item.Type === "Series" ? "Series" : "Movie"],
          recursive: true,
          sortBy: ["CommunityRating"],
          sortOrder: ["Descending"],
          limit: 20,
          genreIds: genreIds.length > 0 ? genreIds : undefined,
          fields: ["Overview", "CommunityRating", "Genres", "ImageTags", "BackdropImageTags"] as any,
        });
        const filtered = (res.data.Items ?? []).filter((i: any) => i.Id !== item.Id);
        setMoreLikeThis(filtered.slice(0, 15));
      } catch (err) {
        console.error("Failed to fetch more like this", err);
      }
    }
    fetchMoreLikeThis();
  }, [item?.Id, authData]);

  // 6. AniList enrichment
  useEffect(() => {
    if (!item) return;
    const isAnime = item.Type === "Series" && item.Genres?.some((g: string) => /anime/i.test(g));
    if (!isAnime) return;
    setAnilistLoading(true);
    fetchAniListCast(item.Name ?? "", item.OriginalTitle ?? "", item.ProductionYear)
      .then((cast) => setAnilistCast(cast))
      .finally(() => setAnilistLoading(false));
  }, [item?.Id]);

  // ─── Action handlers ────────────────────────────────────────────────────────

  const handleToggleWatched = async (
    e: React.MouseEvent,
    itemId: string,
    currentlyWatched: boolean,
    type: "Episode" | "Season"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (type === "Episode") {
      setEpisodes(prev =>
        prev.map(ep => ep.Id === itemId
          ? { ...ep, UserData: { ...(ep.UserData || {}), Played: !currentlyWatched, PlaybackPositionTicks: currentlyWatched ? ep.UserData?.PlaybackPositionTicks : 0 } }
          : ep)
      );
    } else {
      setSeasons(prev =>
        prev.map(s => s.Id === itemId
          ? { ...s, UserData: { ...(s.UserData || {}), Played: !currentlyWatched } }
          : s)
      );
      if (itemId === selectedSeasonId) {
        setEpisodes(prev =>
          prev.map(ep => ({ ...ep, UserData: { ...(ep.UserData || {}), Played: !currentlyWatched, PlaybackPositionTicks: 0 } }))
        );
      }
    }

    try {
      const method = currentlyWatched ? "DELETE" : "POST";
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${itemId}?api_key=${authData.token}`, { method });
    } catch (err) {
      console.error("Failed to toggle watched status", err);
    } finally {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleToggleMainItemWatched = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentlyWatched = item.UserData?.Played;
    setItem((prev: any) => ({
      ...prev,
      UserData: { ...(prev.UserData || {}), Played: !currentlyWatched, PlaybackPositionTicks: currentlyWatched ? prev.UserData?.PlaybackPositionTicks : 0 },
    }));
    try {
      const method = currentlyWatched ? "DELETE" : "POST";
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayedItems/${item.Id}?api_key=${authData.token}`, { method });
    } catch (err) {
      console.error("Failed to toggle main item watched status", err);
    } finally {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleRemoveProgress = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setEpisodes(prev =>
      prev.map(ep => ep.Id === itemId
        ? { ...ep, UserData: { ...(ep.UserData || {}), PlaybackPositionTicks: 0 } }
        : ep)
    );
    try {
      await fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayingItems/${itemId}?api_key=${authData.token}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to remove item progress", err);
    } finally {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return {
    // State
    item,
    seasons,
    selectedSeasonId,
    episodes,
    nextUp,
    isEpisodesLoading,
    moreLikeThis,
    anilistCast,
    anilistLoading,
    // Actions
    setSelectedSeasonId,
    handleToggleWatched,
    handleToggleMainItemWatched,
    handleRemoveProgress,
    refresh: () => setRefreshTrigger(prev => prev + 1),
  };
}
