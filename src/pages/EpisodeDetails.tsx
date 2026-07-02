// src/pages/EpisodeDetails.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getUserLibraryApi } from "@jellyfin/sdk/lib/utils/api/user-library-api";
import { createJellyfinApi } from "../lib/jellyfinApi";
import { useAuthStore } from "../store/auth";
import { PlayButton } from "../components/ui/Buttons";
import { StarRating } from "../components/ui/StarRating";
import DetailsOverview from "../components/details/DetailsOverview";
import ArrowRow from "../components/details/ArrowRow"; // <-- Imported ArrowRow

// ─── Minimalist Avatar Component ──────────────────────────────────
function Avatar({ src, name, className }: { src?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const showImage = !!src && !failed;

  return (
    <div className={`relative rounded-full overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center text-white/40 font-bold text-xs tracking-widest ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export function EpisodeDetails({ authData }: { authData: any }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { authData: authStoreData } = useAuthStore();
  const data = authData || authStoreData;

  const passedEpisode = location.state?.episode;
  const passedSeries = location.state?.series;

  const [episode, setEpisode] = useState<any>(passedEpisode || null);
  const [series, setSeries] = useState<any>(passedSeries || null);
  const [loading, setLoading] = useState(!passedEpisode);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [heroImageSrc, setHeroImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !id) return;
    const episodeId = id;
    window.scrollTo(0, 0);

    async function loadEpisodeData() {
      try {
        const api = createJellyfinApi(data.serverUrl, data.token);
        const itemsApi = getItemsApi(api);
        const userLibraryApi = getUserLibraryApi(api);

        let currentEp = passedEpisode;
        if (!currentEp || currentEp.Id !== episodeId || !currentEp.People || !currentEp.Chapters) {
          setLoading(true);
          const epRes = await itemsApi.getItems({
            userId: data.userId,
            ids: [episodeId],
            fields: ["Overview", "Chapters", "People"] as any,
          });
          currentEp = epRes.data.Items?.[0] ?? null;
          setEpisode(currentEp);
        }

        if (!series && currentEp?.SeriesId) {
          const seriesRes = await userLibraryApi.getItem(currentEp.SeriesId, data.userId);
          setSeries(seriesRes.data);
        }

        if (currentEp?.SeasonId) {
          const siblingsRes = await itemsApi.getItems({
            userId: data.userId,
            parentId: currentEp.SeasonId,
            includeItemTypes: ["Episode"],
            sortBy: ["IndexNumber"],
            fields: ["Overview"] as any,
          });
          setSeasonEpisodes(siblingsRes.data.Items ?? []);
        }
      } catch (error) {
        console.error("Failed to load episode details:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEpisodeData();
  }, [id, data, passedEpisode, passedSeries]);

  if (loading || !episode) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const runtime = episode.RunTimeTicks ? Math.round(episode.RunTimeTicks / 600_000_000) : null;
  const isPlayed = episode.UserData?.Played;
  const year = episode.PremiereDate ? new Date(episode.PremiereDate).getFullYear() : null;
  const heroSrc = heroImageSrc || `${data.serverUrl}/Items/${episode.Id}/Images/Primary?fillWidth=1920&quality=92&api_key=${data.token}`;

  const currentEpisodeIndex = seasonEpisodes.findIndex((ep) => ep.Id === episode.Id);
  const previousEpisode = currentEpisodeIndex > 0 ? seasonEpisodes[currentEpisodeIndex - 1] : null;
  const nextEpisode = currentEpisodeIndex >= 0 && currentEpisodeIndex < seasonEpisodes.length - 1 ? seasonEpisodes[currentEpisodeIndex + 1] : null;

  const actors = episode.People?.filter((p: any) => p.Type === "Actor") || [];
  const guestStars = episode.People?.filter((p: any) => p.Type === "GuestStar" || (p.Type === "Actor" && p.Role?.toLowerCase().includes("guest"))) || [];
  const mainActors = actors.filter((a: any) => !guestStars.some((g: any) => g.Id === a.Id));
  const directors = episode.People?.filter((p: any) => p.Type === "Director") || [];
  const writers = episode.People?.filter((p: any) => p.Type === "Writer") || [];

  const hasCastOrCrew = mainActors.length > 0 || guestStars.length > 0 || directors.length > 0 || writers.length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-white overflow-x-hidden animate-[fadeIn_0.3s_ease-out]">

      {/* ── Floating Header ── */}
      <div className="fixed top-8 left-0 right-0 z-50 flex items-center px-10 pt-5 pb-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button
  onClick={() => {
    // Explicitly grab the Series ID from either the loaded series or the episode data
    const targetSeriesId = series?.Id || episode?.SeriesId;
    if (targetSeriesId) {
      // Navigate directly to the Series Details page and replace history
      navigate(`/title/${targetSeriesId}`, { state: { item: series }, replace: true });
    } else {
      // Fallback just in case the data hasn't loaded yet
      navigate(-1);
    }
  }}
  className="pointer-events-auto flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white bg-black/40 hover:bg-black/70 px-5 py-2 rounded-full border border-white/10 hover:border-white/30 transition-all duration-300 backdrop-blur-md active:scale-95 shadow-lg"
>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Series
        </button>
      </div>

      {/* ── Cinematic Episode Hero ── */}
      <div className="w-full h-[65vh] min-h-[500px] relative overflow-hidden bg-[var(--color-bg-primary)]">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/60 to-black/30 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-primary)]/90 via-[var(--color-bg-primary)]/40 to-transparent z-10 pointer-events-none" />

        <img
          src={heroSrc}
          alt={episode.Name}
          className={`w-full h-full object-cover object-top absolute inset-0 ${isPlayed ? "brightness-50 grayscale-[20%]" : ""}`}
          onError={(e) => {
            if (heroSrc !== `${data.serverUrl}/Items/${episode.SeriesId}/Images/Backdrop?fillWidth=1920&quality=90&api_key=${data.token}`) {
              setHeroImageSrc(`${data.serverUrl}/Items/${episode.SeriesId}/Images/Backdrop?fillWidth=1920&quality=90&api_key=${data.token}`);
            } else {
              e.currentTarget.onerror = null;
            }
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 z-20 px-14 pb-12 max-w-4xl">
          {series && (
            <h2 className="text-sm font-bold text-white/40 mb-3 tracking-[0.2em] uppercase drop-shadow-md">
              {series.Name}
              {episode.SeasonName && ` • ${episode.SeasonName}`}
            </h2>
          )}

          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl leading-tight tracking-tight">
            {episode.Name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60 font-medium tracking-wide mb-8">
            <span className="text-[var(--color-accent)] font-bold uppercase tracking-[0.1em]">Episode {episode.IndexNumber}</span>
            <span className="text-white/20">•</span>
            {episode.ParentIndexNumber && (
              <><span>Season {episode.ParentIndexNumber}</span><span className="text-white/20">•</span></>
            )}
            {runtime && <><span>{runtime}m</span><span className="text-white/20">•</span></>}
            {year && <span>{year}</span>}
            
            {episode.CommunityRating && (
              <>
                <span className="text-white/20 ml-2">|</span>
                <div className="flex items-center gap-1.5 ml-2 text-white/90">
                  <StarRating rating={episode.CommunityRating} voteCount={episode.VoteCount} />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
            <PlayButton large onClick={() => navigate(`/play/${episode.Id}`, { state: { item: episode } })}>
              {isPlayed ? "Play Again" : "Play Episode"}
            </PlayButton>

            <button className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 flex items-center justify-center backdrop-blur-md transition-all">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Details Content ── */}
      <div className="px-14 pb-24 relative z-20 max-w-7xl mx-auto">

        {/* ── Minimalist Season Timeline ── */}
        {seasonEpisodes.length > 1 && (
          <div className="mb-12 border-b border-white/5 -mx-3">
            <ArrowRow>
              {seasonEpisodes.map((ep) => {
                const isActive = ep.Id === episode.Id;
                return (
                  <button
                    key={ep.Id}
                    onClick={() => navigate(`/episode/${ep.Id}`, { state: { episode: ep, series } })}
                    className={`flex-shrink-0 flex flex-col text-left transition-all duration-300 snap-start group pb-3 border-b-2 mr-4
                      ${isActive ? "border-[var(--color-accent)]" : "border-transparent hover:border-white/20"}`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors ${isActive ? "text-[var(--color-accent)]" : "text-white/30 group-hover:text-white/60"}`}>
                      Episode {ep.IndexNumber}
                    </span>
                    <span className={`text-sm font-semibold whitespace-nowrap transition-colors ${isActive ? "text-white" : "text-white/50 group-hover:text-white/90"}`}>
                      {ep.Name}
                    </span>
                  </button>
                );
              })}
            </ArrowRow>
          </div>
        )}

        {/* ── Synopsis ── */}
        <div className="-mt-6 mb-16">
          <DetailsOverview text={episode.Overview} />
        </div>

        {/* ── Episode Gallery (Chapters) ── */}
        {episode.Chapters && episode.Chapters.length > 0 && (
          <div className="mt-8 mb-16 border-t border-white/5 pt-12 -mx-3">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] font-bold mb-6 px-3">
              Episode Gallery
            </h3>
            <ArrowRow>
              {episode.Chapters.map((chapter: any, idx: number) => (
                <div
                  key={chapter.Id || idx}
                  className="flex-shrink-0 w-72 aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] shadow-lg snap-start border border-white/5 relative group"
                >
                  <img
                    src={`${data.serverUrl}/Items/${episode.Id}/Images/Chapter/${idx}?fillWidth=400&quality=90&api_key=${data.token}`}
                    alt={`Chapter ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {chapter.Name && chapter.Name !== `Chapter ${idx + 1}` && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-xs font-bold text-white drop-shadow-md">
                        {chapter.Name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </ArrowRow>
          </div>
        )}

        {/* ── Cast & Crew ── */}
        {hasCastOrCrew && (
          <div className="mt-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] font-bold mb-8">
              Cast & Crew
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 gap-x-8">
              
              {/* Left Column: Cast */}
              {mainActors.length > 0 && (
                <div className="md:col-span-8">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-6">Starring</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
                    {mainActors.slice(0, 12).map((actor: any) => (
                      <div key={actor.Id} className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate(`/person/${actor.Id}`)}>
                        <Avatar 
                          src={actor.PrimaryImageTag || actor.ImageTags?.Primary ? `${data.serverUrl}/Items/${actor.Id}/Images/Primary?fillWidth=100&quality=90&api_key=${data.token}` : undefined} 
                          name={actor.Name} 
                          className="w-10 h-10 group-hover:ring-2 ring-[var(--color-accent)]/50 transition-all shadow-sm" 
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{actor.Name}</span>
                          {actor.Role && <span className="text-xs text-white/40">{actor.Role}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Guest Stars */}
                  {guestStars.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-white/5">
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-6">Guest Stars</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
                        {guestStars.map((guest: any) => (
                          <div key={guest.Id} className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate(`/person/${guest.Id}`)}>
                            <Avatar 
                              src={guest.PrimaryImageTag || guest.ImageTags?.Primary ? `${data.serverUrl}/Items/${guest.Id}/Images/Primary?fillWidth=100&quality=90&api_key=${data.token}` : undefined} 
                              name={guest.Name} 
                              className="w-10 h-10 group-hover:ring-2 ring-[var(--color-accent)]/50 transition-all shadow-sm" 
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{guest.Name}</span>
                              {guest.Role && <span className="text-xs text-white/40">{guest.Role}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Right Column: Crew */}
              {(directors.length > 0 || writers.length > 0) && (
                <div className="md:col-span-4 flex flex-col gap-8 md:pl-8 md:border-l border-white/5">
                  {directors.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-4">Directed By</h4>
                      <div className="flex flex-col gap-4">
                        {directors.map((director: any) => (
                          <div key={director.Id} className="flex flex-col cursor-pointer group" onClick={() => navigate(`/person/${director.Id}`)}>
                            <span className="text-sm font-bold text-white/80 group-hover:text-[var(--color-accent)] transition-colors">{director.Name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {writers.length > 0 && (
                    <div className={directors.length > 0 ? "pt-6 border-t border-white/5" : ""}>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-4">Written By</h4>
                      <div className="flex flex-col gap-4">
                        {writers.map((writer: any) => (
                          <div key={writer.Id} className="flex flex-col cursor-pointer group" onClick={() => navigate(`/person/${writer.Id}`)}>
                            <span className="text-sm font-bold text-white/80 group-hover:text-[var(--color-accent)] transition-colors">{writer.Name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer Navigation (Next/Prev Episode) ── */}
        {(previousEpisode || nextEpisode) && (
          <div className="mt-24 border-t border-white/10 pt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previousEpisode ? (
              <button
                onClick={() => navigate(`/episode/${previousEpisode.Id}`, { state: { episode: previousEpisode, series } })}
                className="group flex flex-col items-start rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-left transition hover:bg-white/10 hover:border-white/20 hover:shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-accent)] font-semibold mb-2">Previous Episode</div>
                <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{previousEpisode.IndexNumber}. {previousEpisode.Name}</div>
              </button>
            ) : <div />}

            {nextEpisode && (
              <button
                onClick={() => navigate(`/episode/${nextEpisode.Id}`, { state: { episode: nextEpisode, series } })}
                className="group flex flex-col items-end rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-right transition hover:bg-white/10 hover:border-white/20 hover:shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-accent)] font-semibold mb-2">Next Episode</div>
                <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{nextEpisode.IndexNumber}. {nextEpisode.Name}</div>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}