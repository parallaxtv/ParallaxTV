interface ShortcutsOverlayProps {
  show: boolean;
  onClose: () => void;
}

export function ShortcutsOverlay({ show, onClose }: ShortcutsOverlayProps) {
  if (!show) return null;

  const shortcuts = [
    { key: "Space / K", desc: "Play or Pause" },
    { key: "← / →", desc: "Seek Backward / Forward 10s" },
    { key: "↑ / ↓", desc: "Volume Up / Down" },
    { key: "M", desc: "Mute / Unmute" },
    { key: "F", desc: "Toggle Fullscreen" },
    { key: "N", desc: "Next Episode" },
    { key: "P", desc: "Previous Episode" },
    { key: "S", desc: "Take Screenshot" },
    { key: "Ctrl + Shift + D", desc: "Stats for Nerds" },
    { key: "?", desc: "Show Keyboard Shortcuts" },
    { key: "Escape", desc: "Close Menus / Exit Player" },
  ];

  return (
    <div 
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white tracking-wide">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="grid gap-3.5">
          {shortcuts.map(s => (
            <div key={s.key} className="flex justify-between items-center text-sm">
              <span className="text-gray-400 font-medium">{s.desc}</span>
              <kbd className="bg-white/10 border border-white/20 text-white font-mono px-2.5 py-1 rounded-md text-[11px] tracking-wider shadow-sm">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}