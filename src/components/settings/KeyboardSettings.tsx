// ─── KeyboardSettings ─────────────────────────────────────────────────────────

const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "Playback",
    items: [
      { keys: ["Space"],  label: "Play / Pause" },
      { keys: ["←"],      label: "Seek back 10 seconds" },
      { keys: ["→"],      label: "Seek forward 10 seconds" },
      { keys: ["↑"],      label: "Volume up" },
      { keys: ["↓"],      label: "Volume down" },
      { keys: ["M"],      label: "Mute / Unmute" },
      { keys: ["F"],      label: "Toggle fullscreen" },
    ],
  },
  {
    group: "Navigation",
    items: [
      { keys: ["N"],         label: "Next episode" },
      { keys: ["P"],         label: "Previous episode" },
      { keys: ["Ctrl", "K"], label: "Open search" },
      { keys: ["Esc"],       label: "Close overlay / Exit fullscreen" },
    ],
  },
  {
    group: "Subtitles & audio",
    items: [
      { keys: ["S"], label: "Cycle subtitle tracks" },
      { keys: ["A"], label: "Cycle audio tracks" },
    ],
  },
  {
    group: "Developer",
    items: [
      { keys: ["Ctrl", "Shift", "D"], label: "Stats for nerds" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center px-2 py-0.5 min-w-[28px] rounded-md
      text-[11px] font-mono font-medium text-gray-300
      bg-white/6 border border-white/10 shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]">
      {children}
    </kbd>
  );
}

export function KeyboardSettings() {
  return (
    <>
      {SHORTCUTS.map((group) => (
        <div key={group.group} className="mb-6">
          <p className="text-[11px] font-semibold tracking-widest text-gray-600 uppercase mb-3">
            {group.group}
          </p>
          <div
            className="rounded-2xl overflow-hidden divide-y divide-white/5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {group.items.map(({ keys, label }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-gray-300">{label}</p>
                <div className="flex items-center gap-1">
                  {keys.map((k, i) => (
                    <span key={k} className="flex items-center gap-1">
                      <Kbd>{k}</Kbd>
                      {i < keys.length - 1 && (
                        <span className="text-[10px] text-gray-700">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-[12px] text-gray-700 mt-2">
        Keyboard shortcuts are active when the player or dashboard is focused.
      </p>
    </>
  );
}