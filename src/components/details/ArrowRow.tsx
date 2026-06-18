// src/components/details/ArrowRow.tsx
import { useRef } from "react";

interface ArrowRowProps {
  children: React.ReactNode;
}

export default function ArrowRow({ children }: ArrowRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75; // Scroll 75% of the container width
      
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative group">
      {/* Left Fade & Arrow */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#141414] to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-start pl-2">
        <button 
          onClick={() => scroll("left")}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center backdrop-blur-sm transition-all shadow-lg pointer-events-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

      {/* Scrollable Container */}
      <div 
        ref={rowRef}
        className="flex overflow-x-auto gap-4 pb-6 pt-2 pl-3 pr-3 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Right Fade & Arrow */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#141414] to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-end pr-2">
        <button 
          onClick={() => scroll("right")}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center backdrop-blur-sm transition-all shadow-lg pointer-events-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}