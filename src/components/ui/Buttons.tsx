import React from 'react';

const OCEAN = "#38bdf8";

// ─── Play Button (Primary Action) ─────────────────────────────────────────────

export function PlayButton({ onClick, large = false, children }: { onClick?: () => void; large?: boolean; children?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex items-center justify-center gap-2 font-bold rounded-full
        transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden shadow-lg
        text-black
        ${large ? "py-2.5 px-7 text-sm min-w-[130px]" : "py-2 px-5 text-xs"}
      `}
      style={{
        backgroundColor: OCEAN,
        boxShadow: `0 4px 14px ${OCEAN}50`,
      }}
    >
      {/* Subtle shine effect on hover */}
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
        }}
      />
      <svg 
        className={large ? "w-4 h-4" : "w-3.5 h-3.5"} 
        viewBox="0 0 24 24" 
        fill="currentColor"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      <span className="relative tracking-wide">{children || "Play Now"}</span>
    </button>
  );
}

// ─── Ghost Button (Secondary Action) ──────────────────────────────────────────

export function GhostButton({ onClick, children, large = false }: { onClick?: () => void; children: React.ReactNode; large?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex items-center justify-center gap-2 font-semibold rounded-full
        backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95
        bg-white/10 hover:bg-white/20 text-white/90 hover:text-white 
        border border-white/20 hover:border-white/50 shadow-lg
        ${large ? "py-2.5 px-7 text-sm min-w-[130px]" : "py-2 px-5 text-xs"}
      `}
    >
      <svg
        className={`${large ? "w-4 h-4" : "w-3.5 h-3.5"} text-white/70 group-hover:text-white transition-colors duration-300`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="tracking-wide">{children}</span>
    </button>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────────

export function IconButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="
        group flex items-center justify-center w-10 h-10 rounded-full 
        backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 
        bg-white/10 hover:bg-white/20 text-white/90 hover:text-white 
        border border-white/20 hover:border-white/50 shadow-lg
      "
    >
      <span className="group-hover:scale-110 transition-transform duration-300">
        {children}
      </span>
    </button>
  );
}