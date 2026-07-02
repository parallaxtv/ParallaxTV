import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { AuthData } from "../../types/auth";

const PARALLAX_API_URL = "https://parallax-api.parallaxtv-api.workers.dev/api/trending";
const TMDB_CACHE_KEY = "parallax_tmdb_trending";
const TMDB_CACHE_TTL = 24 * 60 * 60 * 1000;

export function normTitle(t: string) {
  return t.toLowerCase().replace(/^(the |a |an )/i,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
}

export async function getTmdbTrending(range: "today" | "week" | "month" | "year" = "week"): Promise<{ title: string; year: number | null; rank: number }[]> {
  const cacheKey = `${TMDB_CACHE_KEY}_${range}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < TMDB_CACHE_TTL) return data;
    }
  } catch {}

  try {
    const url = `${PARALLAX_API_URL}?range=${encodeURIComponent(range)}`;
    const res = await fetch(url);
    const json = await res.json();
    
    if (json.success && json.data) {
      try { localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: json.data })); } catch {}
      return json.data;
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch from Parallax API", err);
    return []; 
  }
}

export async function getTop10TrendingInLibrary(authData: AuthData, range: "today" | "week" | "month" | "year" = "week") {
  const api = createJellyfinApi(authData.serverUrl, authData.token);
  const itemsApi = getItemsApi(api);

  // Fetch the ENTIRE library (not just the most recently added items) so trending
  // matching can find titles regardless of when they were added to Jellyfin.
  const res = await itemsApi.getItems({
    userId: authData.userId,
    includeItemTypes: ["Movie", "Series"],
    recursive: true,
    sortBy: ["SortName"],
    sortOrder: [SortOrder.Ascending] as any,
    limit: 10000,
    fields: ["CommunityRating", "ImageTags", "ProductionYear", "Genres", "DateCreated"] as any,
  });

  const library = res.data.Items ?? [];
  if (library.length === 0) return [];

  const now = Date.now();
  const oneYearMs     = 1 * 365 * 24 * 60 * 60 * 1000;

  // Fetch from Cloudflare Worker
  const trending = await getTmdbTrending(range);
  let top10: any[] = [];

  if (trending.length > 0) {
    // Match library items against Parallax API trending list, preserving
    // the trending order returned by the API (rank order).
    const tmdbMatched: any[] = [];
    const tmdbMatchedIds = new Set<string>();

    trending.forEach(t => {
      const match = library.find((item: any) => {
        const norm = normTitle(item.Name ?? "");
        if (norm !== normTitle(t.title ?? "")) return false;
        const year = item.ProductionYear ?? null;
        if (t.year && year) return Math.abs(t.year - year) <= 1;
        return true;
      });
      if (match?.Id && !tmdbMatchedIds.has(match.Id)) {
        tmdbMatched.push(match);
        tmdbMatchedIds.add(match.Id);
      }
    });

    // Always trust real matches — even just 1 — instead of discarding them
    // below an arbitrary threshold. Filler (below) tops up to 10 if needed.
    top10 = tmdbMatched.slice(0, 10);
  } else {
    // No API Response fallback
    const currentYear = new Date().getFullYear();
    const recentPool = library.filter((item: any) => {
      const year = item.ProductionYear ?? 0;
      return currentYear - year <= 3;
    });
    const pool = recentPool.length >= 10 ? recentPool : library;
    pool.sort((a: any, b: any) => (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0));
    top10 = pool.slice(0, 10);
  }

  // Fill items if we have less than 10
  if (top10.length < 10) {
    const selectedIds = new Set(top10.map((item: any) => item.Id));
    const fillItems = library
      .filter((item: any) => !selectedIds.has(item.Id))
      .sort((a: any, b: any) => {
        const aDate = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
        const bDate = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
        const aScore = (a.CommunityRating ?? 0) * 10 + (now - aDate < oneYearMs ? 50 : 0);
        const bScore = (b.CommunityRating ?? 0) * 10 + (now - bDate < oneYearMs ? 50 : 0);
        return bScore - aScore;
      });
    top10 = [...top10, ...fillItems].slice(0, 10);
  }

  return top10;
}