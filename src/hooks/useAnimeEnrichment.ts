/**
 * useAnimeEnrichment
 *
 * Runs once on app load. Does two things:
 *
 * 1. CONTRIBUTE — tries AniList directly from the browser (works fine, only
 *    Cloudflare IPs are banned). If successful, POSTs the enriched data to
 *    our Worker which stores it in KV. Next user benefits immediately.
 *
 * 2. STATS — reports which anime MAL IDs are in this user's Jellyfin library
 *    so the Worker can build a "popular in Parallax libraries" dataset.
 *    Fully anonymised — no user ID, just show IDs.
 */

import { useEffect } from "react";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../lib/jellyfinApi"; 

const API = "https://parallax-api.parallaxtv-api.workers.dev";
const ANILIST = "https://graphql.anilist.co";
const LAST_CONTRIBUTE_KEY = "parallax_last_contribute";
const CONTRIBUTE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours — don't hammer AniList

// ─── AniList query — fetch top 20 trending ───────────────────────────────────
const ANILIST_TRENDING_QUERY = `
query {
  Page(page: 1, perPage: 20) {
    media(sort: [TRENDING_DESC], type: ANIME, isAdult: false) {
      id
      title { english romaji native }
      description(asHtml: false)
      genres
      averageScore
      coverImage { extraLarge color }
      bannerImage
      studios(isMain: true) { nodes { name } }
      characters(sort: [ROLE], perPage: 6) {
        edges {
          role
          node { name { full } image { large } }
          voiceActors(language: JAPANESE) { name { full } image { large } }
        }
      }
    }
  }
}`;

function stripHtml(html: string) {
  return html?.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim() ?? "";
}

function normTitle(t: string) {
  return t.toLowerCase().replace(/^(the |a |an )/i,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
}

function mapAniListItem(m: any) {
  return {
    anilistId:   m.id,
    title:       m.title.english || m.title.romaji,
    altTitle:    m.title.romaji,
    nativeTitle: m.title.native,
    description: m.description ? stripHtml(m.description) : null,
    genres:      m.genres ?? [],
    score:       m.averageScore ?? null,
    posterUrl:   m.coverImage?.extraLarge ?? null,
    accentColor: m.coverImage?.color ?? null,
    backdropUrl: m.bannerImage ?? null,
    studio:      m.studios?.nodes?.[0]?.name ?? null,
    cast: (m.characters?.edges ?? [])
      .filter((e: any) => e.role === "MAIN" || e.role === "SUPPORTING")
      .slice(0, 6)
      .map((e: any) => ({
        charName:   e.node?.name?.full ?? "Unknown",
        charImage:  e.node?.image?.large ?? null,
        actorName:  e.voiceActors?.[0]?.name?.full ?? null,
        actorImage: e.voiceActors?.[0]?.image?.large ?? null,
        role:       e.role,
      })),
    sources: ["anilist"],
  };
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useAnimeEnrichment(authData: any) {
  useEffect(() => {
    if (!authData) return;

    // Throttle: don't run more than once per 6 hours
    const lastRun = localStorage.getItem(LAST_CONTRIBUTE_KEY);
    if (lastRun && Date.now() - parseInt(lastRun) < CONTRIBUTE_INTERVAL) return;

    // Run in the background — never blocks the UI
    runEnrichment(authData).catch(() => {});
  }, [authData?.userId]);
}

async function runEnrichment(authData: any) {
  // ── Step 1: Try AniList trending from the browser ──────────────────────────
  let anilistTrending: any[] = [];
  try {
    const res  = await fetch(ANILIST, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body:    JSON.stringify({ query: ANILIST_TRENDING_QUERY }),
    });
    if (res.ok) {
      const data = await res.json();
      anilistTrending = data?.data?.Page?.media ?? [];
    }
  } catch {
    // AniList unreachable from this client — skip contribution, no harm
    return;
  }

  if (anilistTrending.length === 0) return;

  // ── Step 2: Fetch the Worker's current trending to get MAL IDs ────────────
  // We need the MAL ID to key contributions correctly in KV
  let workerTrending: any[] = [];
  try {
    const res  = await fetch(`${API}/api/anime`);
    const data = await res.json();
    workerTrending = data?.data ?? [];
  } catch {
    return;
  }

  // ── Step 3: Match AniList entries to MAL IDs by title ─────────────────────
  const contributions: { malId: number; anilistId: number; data: any }[] = [];

  for (const aniItem of anilistTrending) {
    const aniNorm1 = normTitle(aniItem.title.english || "");
    const aniNorm2 = normTitle(aniItem.title.romaji  || "");

    const match = workerTrending.find((w: any) => {
      const wNorm1 = normTitle(w.title    || "");
      const wNorm2 = normTitle(w.altTitle || "");
      return wNorm1 === aniNorm1 || wNorm1 === aniNorm2 ||
             wNorm2 === aniNorm1 || wNorm2 === aniNorm2;
    });

    if (match?.malId) {
      contributions.push({
        malId:     match.malId,
        anilistId: aniItem.id,
        data:      mapAniListItem(aniItem),
      });
    }
  }

  // ── Step 4: POST each match to the Worker ─────────────────────────────────
  await Promise.allSettled(
    contributions.map(({ malId, anilistId, data }) =>
      fetch(`${API}/api/anime/contribute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ malId, anilistId, data }),
      })
    )
  );

  // ── Step 5: Report library stats (anonymised) ─────────────────────────────
  try {
    // --- NEW CODE START ---
    const baseApi = createJellyfinApi(authData.serverUrl, authData.token);
    const itemsApi = getItemsApi(baseApi);
    // --- NEW CODE END ---

    const res = await itemsApi.getItems({
      userId:             authData.userId,
      recursive:          true,
      includeItemTypes:   ["Series"],
      fields:             ["Genres", "OriginalTitle", "ProductionYear"] as any,
    });

    const animeInLibrary = (res.data.Items ?? []).filter((item: any) =>
      item.Genres?.some((g: string) => /anime/i.test(g))
    );

    if (animeInLibrary.length === 0) return;

    // Match library shows against AniList/MAL using title
    const matchedMalIds: number[] = [];
    for (const libItem of animeInLibrary) {
      const libNorm = normTitle(libItem.Name || "");
      const match   = workerTrending.find((w: any) =>
        normTitle(w.title || "") === libNorm || normTitle(w.altTitle || "") === libNorm
      );
      if (match?.malId) matchedMalIds.push(match.malId);
    }

    if (matchedMalIds.length > 0) {
      await fetch(`${API}/api/anime/stats`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ malIds: matchedMalIds }),
      });
    }
  } catch {
    // Stats are best-effort — never throw
  }

  // Mark last run time
  try { localStorage.setItem(LAST_CONTRIBUTE_KEY, Date.now().toString()); } catch {}
}
