import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { AuthData } from "../../types/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function imgUrl(serverUrl: string, token: string, id: string, type: "Primary" | "Backdrop", w: number) {
  return `${serverUrl}/Items/${id}/Images/${type}?fillWidth=${w}&quality=90&api_key=${token}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── New Episode Card ─────────────────────────────────────────────────────────

function NewEpisodeCard({ item, authData }: { item: any; authData: AuthData }) {
  const navigate = useNavigate();

  const thumb = item.SeriesId
    ? imgUrl(authData.serverUrl, authData.token, item.SeriesId, "Backdrop", 560)
    : imgUrl(authData.serverUrl, authData.token, item.Id, "Primary", 560);

  const seriesThumb = item.SeriesId
    ? imgUrl(authData.serverUrl, authData.token, item.SeriesId, "Primary", 120)
    : null;

  const playEpisode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/play/${item.Id}`, { state: { item } });
  };

  return (
    <div
      className="flex-shrink-0 w-[280px] cursor-pointer group"
      style={{ scrollSnapAlign: "start" }}
      onClick={() => navigate(`/title/${item.SeriesId ?? item.Id}`, {
        state: { item: { Id: item.SeriesId ?? item.Id, Name: item.SeriesName ?? item.Name, Type: item.SeriesId ? "Series" : item.Type } }
      })}
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1c1c1c] mb-2.5 shadow-lg">
        <img
          src={thumb}
          alt={item.SeriesName ?? item.Name}
          className="w-full h-full object-cover transition-all duration-300
            group-hover:scale-105 group-hover:brightness-75"
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />

        <div className="absolute inset-0 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button onClick={playEpisode} className="w-12 h-12 bg-white hover:bg-white/90 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110" title="Play">
            <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>

        <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black
          px-2 py-0.5 rounded uppercase tracking-wider z-10 shadow-lg">
          New
        </div>

        <div className="absolute bottom-2 left-2 right-2 z-10">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-2">
            {seriesThumb && (
              <img src={seriesThumb} alt="" className="w-6 h-8 object-cover rounded flex-shrink-0"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )}
            <div className="min-w-0">
              <p className="text-white text-[10px] font-bold truncate">
                S{item.ParentIndexNumber} E{item.IndexNumber} · {item.Name}
              </p>
              <p className="text-gray-400 text-[9px]">{timeAgo(item.DateCreated)}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-white text-xs font-semibold truncate px-0.5 group-hover:text-white/80">
        {item.SeriesName ?? item.Name}
      </p>
      <p className="text-gray-600 text-[11px] px-0.5 mt-0.5">
        S{item.ParentIndexNumber} E{item.IndexNumber} added {timeAgo(item.DateCreated)}
      </p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NewEpSkeleton() {
  return (
    <div className="flex-shrink-0 w-[280px]">
      <div className="w-full aspect-video rounded-xl bg-white/5 animate-pulse mb-2.5" />
      <div className="h-2.5 w-3/4 bg-white/5 rounded animate-pulse mb-1.5" />
      <div className="h-2 w-1/2 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

// ─── NewEpisodesRow ───────────────────────────────────────────────────────────

export function NewEpisodesRow({ authData }: { authData: AuthData }) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!authData) return;

    async function load() {
      try {
        const api      = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);

        // 1. Get series the user has watched or started
        const [watchedRes, inProgressRes] = await Promise.all([
          itemsApi.getItems({
            userId: authData.userId,
            includeItemTypes: ["Series"],
            recursive: true,
            filters: ["IsPlayed" as any],
            fields: ["UserData"] as any,
            limit: 200,
          }),
          itemsApi.getItems({
            userId: authData.userId,
            includeItemTypes: ["Series"],
            recursive: true,
            filters: ["IsResumable" as any],
            fields: ["UserData"] as any,
            limit: 200,
          }),
        ]);

        const watchedIds = new Set([
          ...(watchedRes.data.Items  ?? []).map((i: any) => i.Id),
          ...(inProgressRes.data.Items ?? []).map((i: any) => i.Id),
        ]);

        if (watchedIds.size === 0) { setLoading(false); return; }

        // 2. Get recently added episodes — NO minDateLastSaved, NO IsUnplayed filter
        //    to avoid the Jellyfin 500. We filter client-side instead.
        const res = await itemsApi.getItems({
          userId: authData.userId,
          includeItemTypes: ["Episode"],
          recursive: true,
          sortBy: ["DateCreated"],
          sortOrder: [SortOrder.Descending],
          fields: ["Overview", "DateCreated", "SeriesId", "SeriesName",
                   "ParentIndexNumber", "IndexNumber", "ImageTags"] as any,
          limit: 150,
        });

        const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

        // 3. Client-side filters:
        //    - only episodes from series user has watched/started
        //    - only episodes added in the last 30 days
        //    - only unplayed (UserData.Played !== true)
        //    - deduplicate: one card per series (latest ep)
        const seenSeries = new Set<string>();
        const filtered = (res.data.Items ?? [])
          .filter((ep: any) => {
            if (!ep.SeriesId) return false;
            if (!watchedIds.has(ep.SeriesId)) return false;
            if (ep.UserData?.Played) return false;
            const added = ep.DateCreated ? new Date(ep.DateCreated).getTime() : 0;
            if (added < cutoffMs) return false;
            return true;
          })
          .filter((ep: any) => {
            if (seenSeries.has(ep.SeriesId)) return false;
            seenSeries.add(ep.SeriesId);
            return true;
          });

        setEpisodes(filtered.slice(0, 20));
      } catch (err) {
        console.error("New episodes failed", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authData]);

  if (!loading && episodes.length === 0) return null;

  return (
    <div className="mb-10" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-red-600 inline-block" />
          New Episodes
        </h2>
        {!loading && episodes.length > 0 && (
          <span className="text-[11px] text-gray-600 font-medium">
            {episodes.length} show{episodes.length !== 1 ? "s" : ""} updated
          </span>
        )}
      </div>

      <div className="relative">
        <div
          className="flex overflow-x-auto scrollbar-hide"
          style={{ gap: "16px", scrollSnapType: "x mandatory",
                   overflowY: "visible", paddingBottom: "8px", paddingTop: "4px" }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <NewEpSkeleton key={i} />)
            : episodes.map(ep => <NewEpisodeCard key={ep.Id} item={ep} authData={authData} />)
          }
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}