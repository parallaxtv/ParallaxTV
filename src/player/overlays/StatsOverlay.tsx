interface StatsOverlayProps {
  show: boolean;
  stats: {
    fps: number;
    droppedFrames: number;
    videoCodec: string;
    audioCodec: string;
    resolution: string;
    hwdec: string;
  };
  playbackSpeed: number;
  audioTrackName: string;
  subtitleTrackName: string;
  currentTime: string;
  duration: string;
  videoQualityLabel: string; // ── NEW PROP ──
}

export function StatsOverlay({ show, stats, playbackSpeed, audioTrackName, subtitleTrackName, currentTime, duration, videoQualityLabel }: StatsOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute top-8 right-8 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/20 p-5 rounded-xl text-white font-mono text-[11px] z-50 pointer-events-none w-[320px] shadow-2xl animate-[fadeIn_0.15s_ease-out]">
      <h3 className="font-bold text-[var(--color-accent)] mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Stats for Nerds
      </h3>
      
      <div className="flex flex-col gap-2 text-gray-400">
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Viewport</span> <span className="text-gray-100 font-semibold">{stats.resolution}</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Video Codec</span> <span className="text-gray-100 font-semibold">{stats.videoCodec}</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Audio Codec</span> <span className="text-gray-100 font-semibold">{stats.audioCodec}</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>HW Decoder</span> 
          <span className={`font-semibold ${stats.hwdec !== "no" && stats.hwdec !== "No" ? "text-green-400" : "text-yellow-400"}`}>
            {stats.hwdec !== "no" && stats.hwdec !== "No" ? stats.hwdec.toUpperCase() : "SOFTWARE"}
          </span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Framerate</span> <span className="text-gray-100 font-semibold">{stats.fps.toFixed(2)} / s</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-3 mb-2">
          <span>Dropped Frames</span> 
          <span className={`font-semibold ${stats.droppedFrames > 0 ? "text-red-400" : "text-gray-100"}`}>{stats.droppedFrames}</span>
        </div>

        {/* ── NEW METRICS ── */}
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Profile</span> <span className="text-blue-400 font-semibold">{videoQualityLabel}</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Speed</span> <span className="text-gray-100 font-semibold">{playbackSpeed.toFixed(2)}x</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Audio Track</span> <span className="text-gray-100 font-semibold truncate max-w-[150px] text-right" title={audioTrackName}>{audioTrackName}</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-1">
          <span>Subtitles</span> <span className="text-gray-100 font-semibold truncate max-w-[150px] text-right" title={subtitleTrackName}>{subtitleTrackName}</span>
        </div>
        <div className="flex justify-between items-end pt-1">
          <span>Time</span> <span className="text-gray-100 font-semibold">{currentTime} / {duration}</span>
        </div>
      </div>
    </div>
  );
}