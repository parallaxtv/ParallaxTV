// src/components/details/DetailsOverview.tsx
import { useState } from "react";

interface DetailsOverviewProps {
  text?: string;
  charLimit?: number;
}

export default function DetailsOverview({ text, charLimit = 320 }: DetailsOverviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > charLimit;
  const displayed = !isLong || expanded ? text : text.slice(0, charLimit).trimEnd() + "…";

  return (
    <div className="max-w-3xl mt-12 mb-20">
      
      {/* ── Section Header with Inline Divider ── */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[var(--color-accent)] font-bold drop-shadow-md">
          About This Title
        </h2>
        <div className="w-12 h-[2px] rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent-glow)] opacity-80" />
      </div>

      {/* ── Editorial Text Block (No Borders) ── */}
      <p className="text-base md:text-lg leading-8 text-white/80 font-medium drop-shadow-sm transition-all duration-300">
        {displayed}
      </p>

      {/* ── Read More Toggle ── */}
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-6 flex items-center gap-2 text-xs font-bold text-white/50 hover:text-[var(--color-accent)] transition-colors duration-300 group uppercase tracking-widest"
        >
          {expanded ? "Show less" : "Read more"}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-500 ease-in-out ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}