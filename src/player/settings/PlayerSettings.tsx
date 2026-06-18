import { useState, useEffect } from "react";
import { MediaStream } from "../../types/player";

export const QUALITY_OPTIONS = [
  { id: "auto", label: "Auto (Direct Play)", bitrate: null, minWidth: 0 },
  { id: "4k", label: "4K (2160p) - 40 Mbps", bitrate: 40000000, minWidth: 3800 },
  { id: "1440p", label: "1440p - 25 Mbps", bitrate: 25000000, minWidth: 2500 },
  { id: "1080p", label: "1080p (10 Mbps)", bitrate: 10000000, minWidth: 0 },
  { id: "720p", label: "720p (4 Mbps)", bitrate: 4000000, minWidth: 0 },
  { id: "480p", label: "480p (1.5 Mbps)", bitrate: 1500000, minWidth: 0 },
  { id: "360p", label: "360p (720 kbps)", bitrate: 720000, minWidth: 0 },
];

type MenuState = "main" | "speed" | "quality" | "audio" | "subtitles";

interface PlayerSettingsProps {
  show: boolean;
  autoSkipEnabled: boolean;
  onToggleAutoSkip: (val: boolean) => void;
  videoQuality: string;
  onVideoQualityChange: (id: string) => void;
  sourceWidth: number;
  audioTracks: MediaStream[];
  selectedAudio: number | null;
  onAudioChange: (index: number) => void;
  subtitleTracks: MediaStream[];
  selectedSubtitle: number | null;
  onSubtitleChange: (index: number | null) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export function PlayerSettings(props: PlayerSettingsProps) {
  const [activeMenu, setActiveMenu] = useState<MenuState>("main");

  // Reset to main menu whenever the settings overlay is closed
  useEffect(() => {
    if (!props.show) {
      setActiveMenu("main");
    }
  }, [props.show]);

  if (!props.show) return null;

  const formatTrackName = (track: MediaStream | undefined | null) => {
    if (!track) return "Unknown";
    return track.DisplayTitle || track.Language || `Track ${track.Index}`;
  };

  const activeAudioTrack = props.audioTracks.find(t => t.Index === props.selectedAudio);
  const activeSubtitleTrack = props.subtitleTracks.find(t => t.Index === props.selectedSubtitle);
  const activeQuality = QUALITY_OPTIONS.find(q => q.id === props.videoQuality)?.label || "Auto";

  return (
    <div className="absolute bottom-24 right-8 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col z-50 w-[300px] max-w-[90vw] overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        {activeMenu === "main" ? (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[13px] font-bold text-white tracking-wide">Settings</span>
          </div>
        ) : (
          <button 
            onClick={() => setActiveMenu("main")} 
            className="flex items-center gap-2 text-[13px] font-bold text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* ── MENU CONTENT ── */}
      <div className="flex flex-col p-2 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        
        {/* MAIN MENU */}
        {activeMenu === "main" && (
          <>
            <div 
              className="flex items-center justify-between px-3 py-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              onClick={() => props.onToggleAutoSkip(!props.autoSkipEnabled)}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[13px] font-medium text-gray-200">Auto-Skip</span>
              </div>
              <button className={`w-9 h-5 rounded-full transition-colors relative ${props.autoSkipEnabled ? "bg-red-600" : "bg-white/20"}`}>
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform shadow-md ${props.autoSkipEnabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </button>
            </div>
            
            <div className="w-full h-px bg-white/10 my-1" />
            
            <MenuRow title="Quality" value={activeQuality} onClick={() => setActiveMenu("quality")} />
            <MenuRow title="Speed" value={props.playbackSpeed === 1.0 ? "Normal" : `${props.playbackSpeed}x`} onClick={() => setActiveMenu("speed")} />
            <MenuRow title="Audio Track" value={formatTrackName(activeAudioTrack)} onClick={() => setActiveMenu("audio")} />
            <MenuRow title="Subtitles" value={props.selectedSubtitle === null ? "Off" : formatTrackName(activeSubtitleTrack)} onClick={() => setActiveMenu("subtitles")} />
          </>
        )}

        {/* SUB MENUS */}
        {activeMenu === "speed" && (
          [0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
            <OptionRow 
              key={speed} 
              active={props.playbackSpeed === speed} 
              label={speed === 1.0 ? "Normal" : `${speed}x`} 
              onClick={() => { props.onSpeedChange(speed); setActiveMenu("main"); }} 
            />
          ))
        )}

        {activeMenu === "quality" && (
          QUALITY_OPTIONS.filter(q => props.sourceWidth >= q.minWidth).map((q) => (
            <OptionRow 
              key={q.id} 
              active={props.videoQuality === q.id} 
              label={q.label} 
              onClick={() => { props.onVideoQualityChange(q.id); setActiveMenu("main"); }} 
            />
          ))
        )}

        {activeMenu === "audio" && (
          props.audioTracks.map((audio) => (
            <OptionRow 
              key={audio.Index} 
              active={props.selectedAudio === audio.Index} 
              label={formatTrackName(audio)} 
              onClick={() => { props.onAudioChange(audio.Index); setActiveMenu("main"); }} 
            />
          ))
        )}

        {activeMenu === "subtitles" && (
          <>
            <OptionRow 
              active={props.selectedSubtitle === null} 
              label="Off" 
              onClick={() => { props.onSubtitleChange(null); setActiveMenu("main"); }} 
            />
            {props.subtitleTracks.map((sub) => (
              <OptionRow 
                key={sub.Index} 
                active={props.selectedSubtitle === sub.Index} 
                label={formatTrackName(sub)} 
                onClick={() => { props.onSubtitleChange(sub.Index); setActiveMenu("main"); }} 
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ── UI HELPERS ── */

function MenuRow({ title, value, onClick }: { title: string, value: string, onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
      <span className="text-[13px] font-medium text-gray-200">{title}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{value}</span>
        <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

function OptionRow({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left hover:bg-white/5 text-gray-300 hover:text-white"
    >
      <div className="w-4 flex justify-center shrink-0">
        {active && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}