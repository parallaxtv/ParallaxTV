import { useRef, useState, useEffect } from "react";
import { LandscapeCard, PosterCard, Top10Card } from "./MediaCard";
import { AuthData } from "../../types/auth";

// ─── SVG Icons for Row Headers ────────────────────────────────────────────────
const RowIcons = {
  Trending: () => <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Continue: () => <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  UpNext: () => <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Default: () => <span className="w-1.5 h-6 bg-[var(--color-accent)] inline-block rounded-full" />
};

function getIconForTitle(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("trending") || lower.includes("top 10")) return <RowIcons.Trending />;
  if (lower.includes("continue")) return <RowIcons.Continue />;
  if (lower.includes("up next")) return <RowIcons.UpNext />;
  return <RowIcons.Default />;
}

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
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    sync();
    ref.current?.addEventListener("scroll", sync);
    const ro = new ResizeObserver(sync);
    if (ref.current) ro.observe(ref.current);
    return () => { ref.current?.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [children]);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -(itemWidth + gap) * 3 : (itemWidth + gap) * 3, behavior: "smooth" });
  };

  return (
    <div className="relative group/scroll">
      {canLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/scroll:opacity-100"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}

      <div
        ref={ref}
        className="flex overflow-x-auto scrollbar-hide scroll-smooth"
        // Added paddingTop: 16px to prevent clipping when cards translate up on hover
        style={{ gap: `${gap}px`, scrollSnapType: "x mandatory", overflowY: "visible", paddingTop: "16px", paddingBottom: "16px", marginTop: "-16px" }}
      >
        {children}
      </div>

      {canRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-[#1A1A24]/90 border border-white/10 hover:border-white/30 rounded-full text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover/scroll:opacity-100"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
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
      <div className="w-full aspect-video rounded-xl bg-white/5 animate-pulse mb-3" />
      <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
      <div className="h-2 w-1/2 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

function PosterSkeleton() {
  return (
    <div className="flex-shrink-0 w-[150px] md:w-[170px]">
      <div className="w-full aspect-[2/3] rounded-xl bg-white/5 animate-pulse mb-3" />
      <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
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
  authData: AuthData;
  count?: boolean;
  hideHeader?: boolean;
}

export function MediaRow({ title, items, loading, variant, authData, count, hideHeader }: MediaRowProps) {
  if (!loading && items.length === 0) return null;

  const isLandscape = variant === "landscape";
  const isTop10     = variant === "top10";
  const skeletonCount = isLandscape ? 5 : 7;
  
  const itemWidth = isLandscape ? 280 : isTop10 ? 240 : 170;

  return (
    <div className="mb-12" style={{ animation: "rowFadeIn 0.5s ease-out both" }}>
      {!hideHeader && (
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur-sm">
            {getIconForTitle(title)}
          </div>
          <h2 className="text-lg md:text-xl font-semibold tracking-wide text-white">
            {title}
          </h2>
          {count && !loading && items.length > 0 && (
            <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-medium ml-2 border border-white/5">
              {items.length}
            </span>
          )}
        </div>
      )}

      <ArrowScroll itemWidth={itemWidth} gap={16}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) =>
              isLandscape || isTop10
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