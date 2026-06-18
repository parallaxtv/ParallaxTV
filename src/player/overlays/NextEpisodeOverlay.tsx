import { EpisodeInfo } from "../../types/player";
import { AuthData } from "../../types/auth";

const END_COUNTDOWN_SECONDS = 15;
const OUTRO_COUNTDOWN_SECONDS = 10;

interface NextEpisodeOverlayProps {
  nextEpisode: EpisodeInfo | null;
  nextCountdown: number | null;
  autoPlayCancelled: boolean;
  authData: AuthData;
  onPlayNext: () => void;
  onCancel: () => void;
}

export function NextEpisodeOverlay({
  nextEpisode,
  nextCountdown,
  autoPlayCancelled,
  authData,
  onPlayNext,
  onCancel,
}: NextEpisodeOverlayProps) {
  // If no countdown is active, or the user cancelled, or there is no next episode, hide it!
  if (nextCountdown === null || !nextEpisode || autoPlayCancelled) return null;

  // Determine the max countdown for the SVG circle math
  const maxCountdown = nextEpisode.SeriesId ? OUTRO_COUNTDOWN_SECONDS : END_COUNTDOWN_SECONDS;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-end p-8 pointer-events-none">
      <div 
        className="w-[400px] rounded-2xl border border-white/10 bg-[#0e0e0e]/96 shadow-2xl backdrop-blur-xl overflow-hidden pointer-events-auto" 
        style={{ animation: "fadeIn 0.25s ease-out both" }}
      >
        <div className="relative w-full aspect-video bg-[#1a1a1a]">
          <img 
            src={`${authData.serverUrl}/Items/${nextEpisode.Id}/Images/Primary?fillWidth=800&quality=92&api_key=${authData.token}`} 
            alt={nextEpisode.Name} 
            className="w-full h-full object-cover" 
            onError={(e) => { 
              if (nextEpisode.SeriesId) {
                e.currentTarget.src = `${authData.serverUrl}/Items/${nextEpisode.SeriesId}/Images/Backdrop?fillWidth=800&quality=80&api_key=${authData.token}`; 
              }
            }} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          
          <div className="absolute top-3 left-4">
            <span className="text-[10px] font-black tracking-[0.2em] text-red-500 uppercase">Up Next</span>
          </div>
          
          <div className="absolute bottom-3 left-4 right-16">
            <p className="text-gray-400 text-[11px] font-semibold mb-0.5">
              S{nextEpisode.ParentIndexNumber} · E{nextEpisode.IndexNumber}
            </p>
            <h3 className="text-white font-black text-base leading-snug line-clamp-2">
              {nextEpisode.Name}
            </h3>
          </div>
          
          <div className="absolute bottom-3 right-3">
            <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
              <circle 
                cx="22" cy="22" r="18" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (nextCountdown / maxCountdown)}`}
                style={{ transition: "stroke-dashoffset 0.9s linear" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-sm">
              {nextCountdown}
            </span>
          </div>
        </div>
        
        <div className="px-4 py-3 flex items-center gap-3">
          <button 
            onClick={onPlayNext} 
            className="flex items-center gap-2 bg-white text-black font-bold text-sm px-5 py-2 rounded-full hover:bg-gray-200 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play Now
          </button>
          <button 
            onClick={onCancel} 
            className="text-gray-500 hover:text-white text-sm font-semibold px-3 py-2 transition-colors"
          >
            Cancel
          </button>
          <p className="ml-auto text-gray-600 text-xs">
            Press <kbd className="text-gray-500 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">N</kbd> to skip
          </p>
        </div>
      </div>
    </div>
  );
}