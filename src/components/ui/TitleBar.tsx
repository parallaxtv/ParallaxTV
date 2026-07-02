// src/components/ui/TitleBar.tsx
import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

interface TitleBarProps {
  className?: string;
  isTransparent?: boolean;
}

export function TitleBar({ className = "", isTransparent = false }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);

    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleToggleMaximize = async () => {
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  };

  return (
    <div
      className={`fixed top-0 left-0 w-full h-8 z-[200] flex items-center justify-end select-none transition-opacity duration-500
        ${isTransparent ? "bg-transparent" : "bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-white/5"}
        ${className}
      `}
    >
      {/* Drag region fills the whole bar EXCEPT the buttons on the right */}
      <div
        data-tauri-drag-region
        className="absolute inset-0 right-[132px]"
        onDoubleClick={handleToggleMaximize}
      />

      {/* Window control buttons — not part of drag region */}
      <div className="relative flex items-center h-full z-10">
        <button
          onClick={() => appWindow.minimize()}
          className="h-full w-11 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="1" y="4.5" fill="currentColor" /></svg>
        </button>

        <button
          onClick={handleToggleMaximize}
          className="h-full w-11 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect width="7" height="7" x="0.5" y="2.5" fill="none" stroke="currentColor" />
              <path d="M2.5 2.5V0.5H9.5V7.5H7.5" fill="none" stroke="currentColor" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect width="9" height="9" x="0.5" y="0.5" fill="none" stroke="currentColor" />
            </svg>
          )}
        </button>

        <button
          onClick={() => appWindow.close()}
          className="h-full w-11 flex items-center justify-center text-white/50 hover:text-white hover:bg-red-600 transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0L10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
      </div>
    </div>
  );
}