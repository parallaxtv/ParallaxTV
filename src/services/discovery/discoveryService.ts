import { DiscoveryItem, DiscoveryDetail } from "../../types/discovery";

const API = "https://parallax-api.parallaxtv-api.workers.dev";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normTitle(t: string): string {
  if (!t) return "";
  return t.toLowerCase().replace(/^(the |a |an )/i, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function extractYoutubeKey(url?: string | null): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return ytMatch ? ytMatch[1] : null;
}

// ─── Service Functions ───────────────────────────────────────────────────────

export async function fetchDiscoveryItems(
  type: "anime" | "movies" | "kdrama" | "seasonal"
): Promise<DiscoveryItem[]> {
  try {
    const endpoint =
      type === "anime"    ? `${API}/api/anime` :
      type === "seasonal" ? `${API}/api/anime/seasonal` :
      type === "kdrama"   ? `${API}/api/kdrama` :
                            `${API}/api/movies`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!data.success) return [];

    if (type === "anime" || type === "seasonal") {
      return data.data as DiscoveryItem[];
    } else {
      // movies + kdrama — ensure cast is empty array for modal consistency
      return data.data.map((item: DiscoveryItem) => ({ ...item, cast: [] }));
    }
  } catch (err) {
    console.error("fetchDiscoveryItems failed:", err);
    return [];
  }
}

export async function fetchDiscoveryDetails(
  type: "anime" | "movies" | "kdrama" | "seasonal",
  item: DiscoveryItem
): Promise<{ detail: DiscoveryDetail | null; trailerKey: string | null }> {
  try {
    if (type === "anime" || type === "seasonal") {
      // Anime: trailerUrl is often in the search results already
      const directUrl = item.trailerUrl ?? null;
      if (directUrl) {
        return { detail: null, trailerKey: extractYoutubeKey(directUrl) };
      }
      
      // Fallback: full detail fetch by MAL ID
      const malId = item.malId ?? item.id;
      const res = await fetch(`${API}/api/anime/${malId}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        return { 
          detail: data.data, 
          trailerKey: extractYoutubeKey(data.data.trailerUrl) 
        };
      }
      return { detail: null, trailerKey: null };
    }

    // Movies / K-drama: fetch full detail from TMDB via worker
    const endpoint = type === "movies"
      ? `${API}/api/movies/${item.id}`
      : `${API}/api/kdrama/${item.id}`;

    const res = await fetch(endpoint);
    const data = await res.json();
    
    if (data.success && data.data) {
      return { 
        detail: data.data, 
        trailerKey: extractYoutubeKey(data.data.trailer?.youtubeUrl) 
      };
    }
    
    return { detail: null, trailerKey: null };
  } catch (err) {
    console.error("fetchDiscoveryDetails failed:", err);
    return { detail: null, trailerKey: null };
  }
}