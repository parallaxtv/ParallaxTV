import { EpisodeInfo } from "../../types/player";
import { MediaItem } from "../../types/media";

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeekRelative: (seconds: number) => void;
  
  volume: number;
  isMuted: boolean;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMute: () => void;
  
  item: MediaItem | EpisodeInfo;
  prevEpisode: EpisodeInfo | null;
  nextEpisode: EpisodeInfo | null;
  onPlayPrevEpisode: () => void;
  onPlayNextEpisode: () => void;
  
  showEpisodesMenu: boolean;
  onToggleEpisodesMenu: () => void;
  
  showSettings: boolean;
  onToggleSettings: () => void;
  
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  
  onMinimize?: () => void;
  onScreenshot?: () => void;
}

export function PlayerControls({
  isPlaying,
  onTogglePlay,
  onSeekRelative,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  item,
  prevEpisode,
  nextEpisode,
  onPlayPrevEpisode,
  onPlayNextEpisode,
  showEpisodesMenu,
  onToggleEpisodesMenu,
  showSettings,
  onToggleSettings,
  isFullscreen,
  onToggleFullscreen,
  onMinimize
}: PlayerControlsProps) {
  return (
    <div className="flex items-center justify-between">
      {/* ── LEFT SIDE: PLAYBACK & VOLUME ── */}
      <div className="flex items-center gap-6">
        <button onClick={onTogglePlay} className="text-white hover:scale-110 transition-transform">
          {isPlaying
            ? <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button onClick={() => onSeekRelative(-10)} className="text-white/80 hover:text-white transition-colors">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
        </button>
        <button onClick={() => onSeekRelative(10)} className="text-white/80 hover:text-white transition-colors">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" /></svg>
        </button>
        
        {/* VOLUME */}
        <div className="flex items-center gap-2 group/volume relative ml-4">
          <button onClick={onToggleMute} className="text-white/80 hover:text-white transition-colors">
            {isMuted || volume === 0
              ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              : volume < 0.5
              ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M3 9v6h4l5 5V4L7 9H3zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
          </button>
          <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 flex items-center">
            <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={onVolumeChange} className="w-full h-1 bg-white/20 rounded-full appearance-none accent-red-600 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE: NAVIGATION & SETTINGS ── */}
      <div className="flex items-center gap-6">
        {item.Type === "Episode" && prevEpisode && (
          <button onClick={onPlayPrevEpisode} title="Previous Episode (P)" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors group">
            <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity max-w-0 group-hover:max-w-[80px] overflow-hidden whitespace-nowrap text-right">Prev Ep</span>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
        )}
        
        {item.Type === "Episode" && nextEpisode && (
          <button onClick={onPlayNextEpisode} title="Next Episode (N)" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors group">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
            <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity max-w-0 group-hover:max-w-[80px] overflow-hidden whitespace-nowrap">Next Ep</span>
          </button>
        )}
        
        {item.Type === "Episode" && (
          <button onClick={onToggleEpisodesMenu} className={`transition-colors ${showEpisodesMenu ? "text-white" : "text-white/80 hover:text-white"}`} title="Episodes">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </button>
        )}
        
        <button onClick={onToggleSettings} className={`transition-colors ${showSettings ? "text-red-500" : "text-white/80 hover:text-white"}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>

        {onMinimize && (
          <button onClick={onMinimize} className="text-white/80 hover:text-white transition-colors" title="Minimize (-)">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M6 11h12v2H6z"/>
            </svg>
          </button>
        )}
        
        <button onClick={onToggleFullscreen} className="text-white/80 hover:text-white transition-colors" title="Fullscreen (F)">
          {isFullscreen
            ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>}
        </button>
      </div>
    </div>
  );
}