import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { AuthData } from "../jellyfin/items";

const PARALLAX_API_URL = "https://parallax-api.parallaxtv-api.workers.dev/api/trending";
const TMDB_CACHE_KEY = "parallax_tmdb_trending";
const TMDB_CACHE_TTL = 24 * 60 * 60 * 1000;

export function normTitle(t: string) {
  return t.toLowerCase().replace(/^(the |a |an )/i,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
}

export async function getTmdbTrending(): Promise<{ title: string; year: number | null; rank: number }[]> {
  try {
    const cached = localStorage.getItem(TMDB_CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < TMDB_CACHE_TTL) return data;
    }
  } catch {}

  try {
    const res = await fetch(PARALLAX_API_URL);
    const json = await res.json();
    
    if (json.success && json.data) {
      try { localStorage.setItem(TMDB_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: json.data })); } catch {}
      return json.data;
    }
    return [];
  } catch {
    console.error("Failed to fetch from Parallax API");
    return []; 
  }
}

export async function getTop10TrendingInLibrary(authData: AuthData) {
  const api = createJellyfinApi(authData.serverUrl, authData.token);
  const itemsApi = getItemsApi(api);

  // Fetch a broad pool — sorted by DateCreated descending
  const res = await itemsApi.getItems({
    userId: authData.userId,
    includeItemTypes: ["Movie", "Series"],
    recursive: true,
    sortBy: ["DateCreated"],
    sortOrder: [SortOrder.Descending] as any,
    limit: 200,
    fields: ["CommunityRating", "ImageTags", "ProductionYear", "Genres", "DateCreated"] as any,
  });

  const library = res.data.Items ?? [];
  if (library.length === 0) return [];

  const now = Date.now();
  const threeYearsMs  = 3 * 365 * 24 * 60 * 60 * 1000;
  const oneYearMs     = 1 * 365 * 24 * 60 * 60 * 1000;

  // Fetch from Cloudflare Worker
  const trending = await getTmdbTrending();
  let top10: any[] = [];

  if (trending.length > 0) {
    // Match library items against Parallax API trending list
    const tmdbMatched: any[] = [];
    const tmdbMatchedIds = new Set<string>();

    trending.forEach(t => {
      const match = library.find((item: any) => {
        const norm = normTitle(item.Name ?? "");
        if (norm !== t.title) return false;
        const year = item.ProductionYear ?? null;
        if (t.year && year) return Math.abs(t.year - year) <= 1;
        return true;
      });
      if (match?.Id && !tmdbMatchedIds.has(match.Id)) {
        tmdbMatched.push(match);
        tmdbMatchedIds.add(match.Id);
      }
    });

    if (tmdbMatched.length >= 5) {
      top10 = tmdbMatched.slice(0, 10);
    } else {
      const recentPool = library.filter((item: any) => {
        const added = item.DateCreated ? new Date(item.DateCreated).getTime() : 0;
        const year  = item.ProductionYear ?? 0;
        const currentYear = new Date().getFullYear();
        return (now - added < threeYearsMs) || (currentYear - year <= 3);
      });

      const pool = recentPool.length >= 10 ? recentPool : library;
      const scored = pool.map((item: any) => {
        const isMatched = tmdbMatchedIds.has(item.Id);
        const added = item.DateCreated ? new Date(item.DateCreated).getTime() : 0;
        const recencyBoost = now - added < oneYearMs ? 50 : 0;
        return {
          item,
          score: (isMatched ? 500 : 0) + recencyBoost + (item.CommunityRating ?? 0) * 10,
        };
      });
      scored.sort((a, b) => b.score - a.score);
      top10 = scored.slice(0, 10).map(s => s.item);
    }
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