import { useRef, useState, useEffect } from "react";
import { LandscapeCard, PosterCard, Top10Card } from "./MediaCard";
import { AuthData } from "../../types/auth";

// ─── Arrow scroll container ───────────────────────────────────────────────────

function ArrowScroll({
  children,
  itemWidth,
  gap = 16,
}: {
  children: React.ReactNode;
  itemWidth: number;
  gap?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    sync();
    ref.current?.addEventListener("scroll", sync);
    // Re-check when children change (data loads)
    const ro = new ResizeObserver(sync);
    if (ref.current) ro.observe(ref.current);
    return () => { ref.current?.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [children]);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -(itemWidth + gap) * 3 : (itemWidth + gap) * 3, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {canLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute -left-5 top-1/2 -translate-y-1/2 z-20
            w-10 h-10 flex items-center justify-center
            bg-black/80 hover:bg-black border border-white/10 hover:border-white/30
            rounded-full text-white shadow-xl backdrop-blur-sm
            transition-all duration-200 hover:scale-110"
          aria-label="Scroll left"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div
        ref={ref}
        className="flex overflow-x-auto scrollbar-hide"
        style={{ gap: `${gap}px`, scrollSnapType: "x mandatory", overflowY: "visible", paddingTop: "4px", paddingBottom: "8px" }}
      >
        {children}
      </div>

      {canRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute -right-5 top-1/2 -translate-y-1/2 z-20
            w-10 h-10 flex items-center justify-center
            bg-black/80 hover:bg-black border border-white/10 hover:border-white/30
            rounded-full text-white shadow-xl backdrop-blur-sm
            transition-all duration-200 hover:scale-110"
          aria-label="Scroll right"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function LandscapeSkeleton() {
  return (
    <div className="flex-shrink-0 w-[280px]">
      <div className="w-full aspect-video rounded-xl bg-white/5 animate-pulse mb-2.5" />
      <div className="h-2.5 w-3/4 bg-white/5 rounded animate-pulse mb-1.5" />
      <div className="h-2 w-1/2 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

function PosterSkeleton() {
  return (
    <div className="flex-shrink-0 w-[150px]">
      <div className="w-full h-[225px] rounded-xl bg-white/5 animate-pulse mb-2.5" />
      <div className="h-2.5 w-3/4 bg-white/5 rounded animate-pulse mb-1.5" />
      <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

// ─── MediaRow ─────────────────────────────────────────────────────────────────

export type RowVariant = "landscape" | "poster" | "top10";

interface MediaRowProps {
  title: string;
  items: any[];
  loading: boolean;
  variant: RowVariant;
  authData: AuthData; // CHANGE THIS
  /** Optional accent label shown next to the title e.g. "4 titles" */
  count?: boolean;
}

export function MediaRow({ title, items, loading, variant, authData, count }: MediaRowProps) {
  // Hide row completely when done loading and empty
  if (!loading && items.length === 0) return null;

  const isLandscape = variant === "landscape";
  const isTop10     = variant === "top10";
  const skeletonCount = isLandscape ? 5 : 7;
  const itemWidth = isLandscape ? 280 : isTop10 ? 200 : 150;

  return (
    <div className="mb-10" style={{ animation: "rowFadeIn 0.4s ease-out both" }}>
      {/* Row header */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2.5">
          <span className="w-3 h-px bg-red-600 inline-block" />
          {title}
        </h2>
        {count && !loading && items.length > 0 && (
          <span className="text-[11px] text-gray-600 font-medium">
            {items.length} title{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Cards */}
      <ArrowScroll itemWidth={itemWidth} gap={16}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) =>
              isLandscape
                ? <LandscapeSkeleton key={i} />
                : <PosterSkeleton key={i} />
            )
          : items.map((item, idx) =>
              isLandscape
                ? <LandscapeCard key={item.Id} item={item} authData={authData} />
                : isTop10
                  ? <Top10Card key={item.Id} item={item} rank={idx + 1} authData={authData} />
                  : <PosterCard key={item.Id} item={item} authData={authData} />
            )
        }
      </ArrowScroll>

      <style>{`
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
