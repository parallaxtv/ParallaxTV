import { useEffect } from "react";
import { createPortal } from "react-dom";

interface DiscoveryTrailerProps {
  trailerKey: string;
  title: string;
  onClose: () => void;
}

export function DiscoveryTrailer({ trailerKey, title, onClose }: DiscoveryTrailerProps) {
  // Handle Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex: 999999, animation: "dFadeIn 0.2s ease-out" }}
    >
      {/* iframe fills the screen */}
      <iframe
        key={`fs-${trailerKey}`}
        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
        allow="autoplay; encrypted-media"
        className="absolute top-1/2 left-1/2"
        style={{
          border: "none",
          width: "177.78vh",
          height: "100vh",
          minWidth: "100%",
          minHeight: "56.25vw",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 pt-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-0.5">Trailer</p>
          <h2 className="text-lg font-black text-white leading-tight drop-shadow-lg">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white backdrop-blur-sm transition-all hover:scale-110"
          aria-label="Close trailer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}