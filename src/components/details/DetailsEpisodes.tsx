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
        <div className="flex gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[340px]">
              <div className="w-full aspect-video rounded-xl bg-white/5 animate-pulse mb-4 border border-white/5" />
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse mb-3" />
              <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse mb-3" />
              <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-white/5 rounded-2xl bg-white/5">
          <p className="text-white/40 font-medium">No episodes found for this season.</p>
        </div>
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
                className="flex-shrink-0 w-[340px] group/ep relative"
                style={{ scrollSnapAlign: "start" }}
              >
                {/* Thumbnail Container */}
                <div 
                  // Clicking the image navigates to the dedicated Episode page
                  onClick={() => navigate(`/episode/${ep.Id}`, { state: { episode: ep, series: item } })}
                  className={`relative w-full aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] mb-4 shadow-lg cursor-pointer transition-all duration-300 ring-2 ring-transparent group-hover/ep:ring-[var(--color-accent)]/30 group-hover/ep:shadow-[0_10px_30px_rgba(0,0,0,0.8)]`}
                >
                  <img
                    src={`${authData.serverUrl}/Items/${ep.Id}/Images/Primary?fillWidth=680&quality=92&api_key=${authData.token}`}
                    alt={ep.Name}
                    className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover/ep:scale-105 ${isPlayed ? "brightness-50 grayscale-[30%]" : "brightness-90 group-hover/ep:brightness-50"}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `${authData.serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=680&quality=90&api_key=${authData.token}`;
                    }}
                  />

                  {/* ── Badges ── */}
                  {isNextUp && (
                    <div className="absolute top-2.5 left-2.5 bg-[var(--color-accent)]/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-widest z-10 shadow-[0_2px_10px_var(--color-accent-glow)] flex items-center gap-1.5">
                      <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Continue Watching
                    </div>
                  )}

                  {isPlayed && (
                    <div className="absolute top-2.5 right-2.5 bg-black/60 border border-white/10 rounded-full p-1 backdrop-blur-md z-10 group-hover/ep:opacity-0 transition-opacity duration-300 shadow-lg">
                      <svg className="w-4 h-4 text-white/90 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* ── Progress Bar ── */}
                  {!isPlayed && progressPct > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black/60 z-10 overflow-hidden">
                      <div className="h-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)] transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  )}

                  {/* ── Central Play Button (Appears on Hover) ── */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/ep:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
                    <button 
                      // Clicking play stops propagation so it doesn't open the page, and launches playback
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/play/${ep.Id}`, { state: { item: ep } });
                      }}
                      className="w-14 h-14 bg-[var(--color-accent)] rounded-full flex items-center justify-center shadow-[0_0_20px_var(--color-accent-glow)] transform scale-90 group-hover/ep:scale-100 transition-all duration-300 pointer-events-auto hover:brightness-110 active:scale-95"
                    >
                      <svg className="w-6 h-6 fill-white ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  </div>
                </div>

                {/* ── Meta Actions Menu (Top Right on Hover) ── */}
                <div className="absolute top-2 right-2 opacity-0 group-hover/ep:opacity-100 transition-opacity duration-300 z-30 flex items-center gap-2">
                  {!isPlayed && progressPct > 0 && (
                    <button
                      onClick={(e) => onRemoveProgress(e, ep.Id)}
                      title="Clear Progress"
                      className="w-8 h-8 bg-black/70 hover:bg-black border border-white/10 hover:border-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => onToggleWatched(e, ep.Id, isPlayed, "Episode")}
                    title={isPlayed ? "Mark as Unwatched" : "Mark as Watched"}
                    className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110 active:scale-95 border
                      ${isPlayed 
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/50" 
                        : "bg-black/70 hover:bg-black text-white border-white/10 hover:border-white/30"}`}
                  >
                    {isPlayed ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* ── Editorial Episode Typography ── */}
                <div className="px-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                      Episode {ep.IndexNumber}
                    </span>
                    {epRuntime && (
                      <span className="bg-white/5 border border-white/10 text-white/50 text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider">
                        {epRuntime}m
                      </span>
                    )}
                    {isNextUp && (
                      <span className="bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        Next Up
                      </span>
                    )}
                  </div>
                  
                  <h4 className={`text-base font-bold truncate mb-2 ${isPlayed ? "text-white/40" : "text-white/90 group-hover/ep:text-white transition-colors"}`}>
                    {ep.Name}
                  </h4>
                  
                  <p className="text-white/40 text-xs leading-relaxed line-clamp-2 font-medium">
                    {ep.Overview ? `"${ep.Overview}"` : "No description available."}
                  </p>
                </div>
              </div>
            );
          })}
        </ArrowRow>
      )}
    </div>
  );
}