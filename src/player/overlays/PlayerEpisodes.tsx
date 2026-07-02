import { useRef, useState, useEffect } from "react";
import { EpisodeInfo, SeasonInfo } from "../../types/player";
import { AuthData } from "../../types/auth";

interface PlayerEpisodesProps {
  show: boolean;
  onClose: () => void;
  seasons: SeasonInfo[];
  episodes: EpisodeInfo[];
  selectedSeasonId: string;
  onSeasonSelect: (id: string) => void;
  currentItemId: string;
  authData: AuthData;
  onEpisodeClick: (ep: EpisodeInfo) => void;
  currentProgress: number; // ── NEW PROP ──
}

export function PlayerEpisodes({
  show,
  onClose,
  seasons,
  episodes,
  selectedSeasonId,
  onSeasonSelect,
  currentItemId,
  authData,
  onEpisodeClick,
  currentProgress // ── DESTRUCTURED ──
}: PlayerEpisodesProps) {
  const seasonsRef = useRef<HTMLDivElement>(null);
  const episodesRef = useRef<HTMLDivElement>(null);
  
  const [canScrollSeasonLeft, setCanScrollSeasonLeft] = useState(false);
  const [canScrollSeasonRight, setCanScrollSeasonRight] = useState(true);

  // Scroll visibility logic
  useEffect(() => {
    if (seasonsRef.current) {
      setCanScrollSeasonLeft(seasonsRef.current.scrollLeft > 5);
      setCanScrollSeasonRight(seasonsRef.current.scrollLeft < seasonsRef.current.scrollWidth - seasonsRef.current.clientWidth - 5);
    }
  }, [seasons]);

  const scrollSeasons = (dir: "left" | "right") => {
    seasonsRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-[450px] bg-[#141414]/95 backdrop-blur-3xl border-l border-white/10 p-8 shadow-2xl z-40 flex flex-col animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Episodes</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Seasons Row */}
      <div className="relative border-b border-white/10 pb-4 mb-4 flex items-center group/seasons">
        {canScrollSeasonLeft && (
          <button onClick={() => scrollSeasons("left")} className="absolute left-0 z-10 bg-gradient-to-r from-[#141414] via-[#141414]/90 to-transparent h-full pr-4 text-white hover:text-white/80">
            <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        
        <div ref={seasonsRef} className="flex gap-2 overflow-x-auto w-full scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {seasons.map((season) => (
            <button 
              key={season.Id} 
              onClick={() => onSeasonSelect(season.Id)} 
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedSeasonId === season.Id ? "bg-white text-black" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
            >
              {season.Name}
            </button>
          ))}
        </div>

        {canScrollSeasonRight && (
          <button onClick={() => scrollSeasons("right")} className="absolute right-0 z-10 bg-gradient-to-l from-[#141414] via-[#141414]/90 to-transparent h-full pl-4 text-white hover:text-white/80">
            <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      {/* Episodes List */}
      <div ref={episodesRef} className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {episodes.map((ep) => {
          // Calculate watch progress
          const isPlayed = ep.UserData?.Played;
          const positionTicks = ep.UserData?.PlaybackPositionTicks || 0;
          const runTimeTicks = ep.RunTimeTicks || 1;
          
          // ── THE FIX ──
          // If this is the current episode, use the live player progress.
          // Otherwise, use Jellyfin's saved progress.
          const progressPct = ep.Id === currentItemId 
            ? currentProgress 
            : (isPlayed ? 100 : positionTicks > 0 ? Math.min(100, (positionTicks / runTimeTicks) * 100) : 0);

          return (
            <div 
              key={ep.Id} 
              onClick={() => onEpisodeClick(ep)} 
              className={`flex gap-4 p-3 rounded-lg cursor-pointer transition-colors ${ep.Id === currentItemId ? "bg-white/10 ring-1 ring-white/30" : "hover:bg-white/5"}`}
            >
              <div className="w-[120px] aspect-video bg-[#1e1e1e] rounded overflow-hidden flex-shrink-0 relative pointer-events-none">
                <img 
                  src={`${authData.serverUrl}/Items/${ep.Id}/Images/Primary?fillWidth=240&quality=90&api_key=${authData.token}`} 
                  alt="" 
                  className={`w-full h-full object-cover transition-opacity ${isPlayed && ep.Id !== currentItemId ? "opacity-60" : "opacity-100"}`} 
                  onError={(e) => { e.currentTarget.style.display = "none"; }} 
                />
                
                {/* Playing Overlay */}
                {ep.Id === currentItemId && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <svg className="w-6 h-6 fill-white drop-shadow-lg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                )}

                {/* Watched Progress Bar */}
                {progressPct > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div className="h-full bg-[var(--color-accent)]" style={{ width: `${progressPct}%` }} />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${ep.Id === currentItemId ? "text-white" : isPlayed ? "text-gray-400" : "text-gray-200"}`}>
                    {ep.IndexNumber}. {ep.Name}
                  </span>
                  
                  {/* The Watched Tickmark */}
                  {isPlayed && ep.Id !== currentItemId && (
                    <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs mt-1 line-clamp-2 ${isPlayed ? "text-gray-600" : "text-gray-400"}`}>
                  {ep.Overview || "No description."}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}