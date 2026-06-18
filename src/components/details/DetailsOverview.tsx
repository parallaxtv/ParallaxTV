// src/components/details/DetailsOverview.tsx
import { useState } from "react";

interface DetailsOverviewProps {
  text?: string;
  charLimit?: number;
}

export default function DetailsOverview({ text, charLimit = 280 }: DetailsOverviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > charLimit;
  const displayed = !isLong || expanded ? text : text.slice(0, charLimit).trimEnd() + "…";

  return (
    // mb-8 instead of mt-4 so there's a clear gap between the overview block
    // (including the Read More button) and the Seasons section header below it.
    <div className="max-w-4xl mt-4 mb-12">
      <p className="text-sm md:text-base leading-relaxed text-gray-300 drop-shadow-md">
        {displayed}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white transition-colors group uppercase tracking-wider"
        >
          {expanded ? "Show less" : "Read more"}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}