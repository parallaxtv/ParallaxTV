// src/components/details/TrailerPlayer.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface TrailerPlayerProps {
  trailerKey: string;
  onHide: () => void;
}

const embedUrl = (key: string, mute: boolean) =>
  `https://www.youtube.com/embed/${key}?autoplay=1&mute=${mute ? 1 : 0}&controls=1&loop=1&playlist=${key}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`;

function FullscreenOverlay({ trailerKey, containerRef, onClose }: {
  trailerKey: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement ?? (document as any).webkitFullscreenElement;
      if (!fsEl) onClose();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const handleClose = () => {
    const fsEl = document.fullscreenElement ?? (document as any).webkitFullscreenElement;
    if (fsEl) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    } else {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black"
      style={{ width: "100vw", height: "100vh" }}
    >
      <iframe
        src={embedUrl(trailerKey, false)}
        allow="autoplay; encrypted-media; fullscreen"
        style={{ border: "none", width: "100%", height: "100%", display: "block" }}
      />
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center
          rounded-full bg-black/70 hover:bg-white border border-white/30
          text-white hover:text-black transition-all duration-200 shadow-xl"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>,
    document.body
  );
}

export default function TrailerPlayer({ trailerKey, onHide }: TrailerPlayerProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const bgIframeRef   = useRef<HTMLIFrameElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (bgIframeRef.current) bgIframeRef.current.src = "";
    };
  }, []);

  const handleFullscreen = () => {
    // Mount the overlay first so the div exists in the DOM
    setShowFullscreen(true);

    // requestFullscreen must be called synchronously in the click handler.
    // The container div doesn't exist yet (React hasn't committed the portal),
    // so we use requestAnimationFrame to wait one paint — still within the
    // trusted user-gesture window that browsers allow for fullscreen.
    requestAnimationFrame(() => {
      const el = containerRef.current as any;
      if (!el) return;
      if (el.requestFullscreen)            el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen)    el.mozRequestFullScreen();
      else if (el.msRequestFullscreen)     el.msRequestFullscreen();
    });
  };

  const handleHide = () => {
    if (bgIframeRef.current) bgIframeRef.current.src = "";
    onHide();
  };

  return (
    <>
      {/* Background ambient iframe — muted */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <iframe
          ref={bgIframeRef}
          src={embedUrl(trailerKey, true)}
          allow="autoplay; encrypted-media; fullscreen"
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{
            border: "none",
            width: "177.78vh",
            height: "100vh",
            minWidth: "100%",
            minHeight: "56.25vw",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* Controls */}
      <div
        className="absolute top-20 right-6 z-30 flex items-center gap-2"
        style={{ animation: "fadeIn 0.4s ease-out" }}
      >
        <button
          onClick={handleFullscreen}
          title="Watch fullscreen"
          className="group relative w-9 h-9 flex items-center justify-center rounded-full
            bg-black/70 hover:bg-white border border-white/20 hover:border-white
            text-white hover:text-black backdrop-blur-sm transition-all duration-200 shadow-lg pointer-events-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150
            bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider whitespace-nowrap pointer-events-none">
            Fullscreen
          </span>
        </button>

        <button
          onClick={handleHide}
          title="Close trailer"
          className="group relative w-9 h-9 flex items-center justify-center rounded-full
            bg-black/70 hover:bg-white border border-white/20 hover:border-white
            text-white hover:text-black backdrop-blur-sm transition-all duration-200 shadow-lg pointer-events-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150
            bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider whitespace-nowrap pointer-events-none">
            Close
          </span>
        </button>
      </div>

      {showFullscreen && (
        <FullscreenOverlay
          trailerKey={trailerKey}
          containerRef={containerRef}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </>
  );
}
