import { DiscoveryItem, DiscoveryDetail } from "../../types/discovery";
import { extractYoutubeKey } from "../../utils/trailers";

const API = "https://parallax-api.parallaxtv-api.workers.dev";

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

    // Guard: If the API goes down (like a 500 error), fail silently and gracefully
    if (!res.ok) {
      console.warn(`[DiscoveryService] API returned ${res.status} for ${type}`);
      return [];
    }

    const data = await res.json();

    if (!data?.success) return [];

    if (type === "anime" || type === "seasonal") {
      return data.data as DiscoveryItem[];
    } else {
      // movies + kdrama — ensure cast is empty array for modal consistency
      return data.data.map((item: DiscoveryItem) => ({ ...item, cast: [] }));
    }
  } catch (err) {
    console.warn(`[DiscoveryService] Network error fetching items for ${type}:`, err);
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
      
      if (!res.ok) return { detail: null, trailerKey: null };

      const data = await res.json();
      
      if (data?.success && data?.data) {
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
    
    if (!res.ok) return { detail: null, trailerKey: null };

    const data = await res.json();
    
    if (data?.success && data?.data) {
      return { 
        detail: data.data, 
        trailerKey: extractYoutubeKey(data.data.trailer?.youtubeUrl) 
      };
    }
    
    return { detail: null, trailerKey: null };
  } catch (err) {
    console.warn(`[DiscoveryService] Network error fetching details for ${item.title}:`, err);
    return { detail: null, trailerKey: null };
  }
}
