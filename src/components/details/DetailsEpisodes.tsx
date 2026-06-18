// src/components/details/DetailsEpisodes.tsx
import { useNavigate } from "react-router-dom";
import ArrowRow from "./ArrowRow";
import SectionHeader from "./SectionHeader";

interface DetailsEpisodesProps {
  item: any;
  authData: any;
  episodes: any[];
  selectedSeasonId: string;
  nextUp: any | null;
  isLoading: boolean;
  onToggleWatched: (e: React.MouseEvent, itemId: string, currentlyWatched: boolean, type: "Episode") => void;
  onRemoveProgress: (e: React.MouseEvent, itemId: string) => void;
}

export default function DetailsEpisodes({
  item,
  authData,
  episodes,
  selectedSeasonId,
  nextUp,
  isLoading,
  onToggleWatched,
  onRemoveProgress,
}: DetailsEpisodesProps) {
  const navigate = useNavigate();

  if (item.Type !== "Series" || !selectedSeasonId) return null;

  return (
    <div className="mb-14" style={{ animation: "fadeSlideUp 0.5s 0.2s ease-out both" }}>
      <SectionHeader title="Episodes" subtitle={!isLoading ? episodes.length : undefined} />

      {isLoading ? (
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[300px]">
              <div className="w-full aspect-video rounded-xl bg-white/5 animate-pulse mb-3" />
              <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <p className="text-gray-600 py-8">No episodes found.</p>
      ) : (
        <ArrowRow>
          {episodes.map((ep) => {
            const isPlayed    = ep.UserData?.Played;
            const progressPct = ep.UserData?.PlaybackPositionTicks && ep.RunTimeTicks
              ? (ep.UserData.PlaybackPositionTicks / ep.RunTimeTicks) * 100
              : 0;
            const epRuntime = ep.RunTimeTicks ? Math.round(ep.RunTimeTicks / 600_000_000) : null;
            const isNextUp  = nextUp?.Id === ep.Id;

            return (
              <div
                key={ep.Id}
                className="flex-shrink-0 w-[300px] group/ep cursor-pointer"
                style={{ scrollSnapAlign: "start" }}
                onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1e1e1e] mb-3 shadow-lg">
                  <img
                    src={`${authData.serverUrl}/Items/${ep.Id}/Images/Primary?fillWidth=600&quality=90&api_key=${authData.token}`}
                    alt={ep.Name}
                    className={`w-full h-full object-cover transition duration-300 group-hover/ep:scale-105 ${isPlayed ? "brightness-50" : "group-hover/ep:brightness-75"}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `${authData.serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=600&quality=90&api_key=${authData.token}`;
                    }}
                  />

                  {isNextUp && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider z-10">
                      Up Next
                    </div>
                  )}

                  {isPlayed && (
                    <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 backdrop-blur-sm z-10 group-hover/ep:opacity-0 transition-opacity duration-200">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {!isPlayed && progressPct > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/60 z-10">
                      <div className="h-full bg-red-600 transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  )}

                  {/* Hover action overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover/ep:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-between p-2.5 pointer-events-none">
                    <div className="flex justify-end gap-2 pointer-events-auto">
                      <button
                        onClick={(e) => onToggleWatched(e, ep.Id, isPlayed, "Episode")}
                        className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110"
                      >
                        {isPlayed ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {!isPlayed && progressPct > 0 && (
                        <button
                          onClick={(e) => onRemoveProgress(e, ep.Id)}
                          className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Centre play button */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/play/${ep.Id}`, { state: { item: ep } }); }}
                        className="w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-2xl drop-shadow-2xl pointer-events-auto transition-transform hover:scale-110"
                        title="Play"
                      >
                        <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Episode info */}
                <div className="flex items-start justify-between mb-1 px-0.5">
                  <h4 className={`font-semibold text-sm truncate pr-2 flex-1 leading-snug ${isPlayed ? "text-gray-500" : "text-white"}`}>
                    <span className="text-gray-600 mr-1.5 font-normal">{ep.IndexNumber}.</span>
                    {ep.Name}
                  </h4>
                  {epRuntime && <span className="text-xs text-gray-600 flex-shrink-0">{epRuntime}m</span>}
                </div>
                <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed px-0.5">
                  {ep.Overview || "No description available."}
                </p>
              </div>
            );
          })}
        </ArrowRow>
      )}
    </div>
  );
}