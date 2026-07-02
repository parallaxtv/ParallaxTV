// src/components/details/ArrowRow.tsx
import { useRef, useState, useEffect } from "react";

interface ArrowRowProps {
  children: React.ReactNode;
}

export default function ArrowRow({ children }: ArrowRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(true); // Default to true so it doesn't flash empty

  const handleScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    
    // If the content doesn't overflow the container at all, hide both arrows
    if (scrollWidth <= clientWidth) {
      setIsAtStart(true);
      setIsAtEnd(true);
      return;
    }

    // A 24px buffer handles the pl-3/pr-3 CSS padding offsets caused by snap-x
    // as well as sub-pixel precision bugs on high-DPI scaling displays.
    setIsAtStart(scrollLeft <= 24);
    setIsAtEnd(Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 24);
  };

  useEffect(() => {
    // Initial check
    handleScroll();
    
    // Small timeout to catch delayed layout shifts (like images rendering)
    const timer = setTimeout(handleScroll, 150);
    
    const node = rowRef.current;
    if (!node) return;

    // ResizeObserver watches the container and dynamically updates arrows
    // if the browser window resizes or if child content expands
    const observer = new ResizeObserver(() => handleScroll());
    observer.observe(node);

    window.addEventListener("resize", handleScroll);
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", handleScroll);
    };
  }, [children]);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.55; 
      
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative group/row">
      {/* ── Left Fade & Arrow ── */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-[var(--color-bg-primary)]/95 to-transparent z-10 pointer-events-none flex items-center justify-start pl-2 transition-opacity duration-300 ${
          isAtStart ? "opacity-0" : "opacity-100"
        }`}
      >
        <button 
          onClick={() => scroll("left")}
          disabled={isAtStart}
          aria-label="Scroll left"
          className={`group/btn w-10 h-10 rounded-full bg-black/20 text-white/80 border border-white/10 flex items-center justify-center backdrop-blur-xl transition-all duration-300 shadow-lg ${
            isAtStart 
              ? "pointer-events-none" 
              : "pointer-events-auto opacity-30 hover:opacity-100 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:shadow-[0_0_15px_var(--color-accent-glow)]"
          }`}
        >
          <svg className="w-5 h-5 transition-transform duration-300 group-hover/btn:-translate-x-[2px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

      {/* ── Scrollable Container ── */}
      <div 
        ref={rowRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto gap-4 pb-6 pt-2 pl-3 pr-3 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* ── Right Fade & Arrow ── */}
      <div 
        className={`absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-[var(--color-bg-primary)]/95 to-transparent z-10 pointer-events-none flex items-center justify-end pr-2 transition-opacity duration-300 ${
          isAtEnd ? "opacity-0" : "opacity-100"
        }`}
      >
        <button 
          onClick={() => scroll("right")}
          disabled={isAtEnd}
          aria-label="Scroll right"
          className={`group/btn w-10 h-10 rounded-full bg-black/20 text-white/80 border border-white/10 flex items-center justify-center backdrop-blur-xl transition-all duration-300 shadow-lg ${
            isAtEnd 
              ? "pointer-events-none" 
              : "pointer-events-auto opacity-30 hover:opacity-100 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:shadow-[0_0_15px_var(--color-accent-glow)]"
          }`}
        >
          <svg className="w-5 h-5 transition-transform duration-300 group-hover/btn:translate-x-[2px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}