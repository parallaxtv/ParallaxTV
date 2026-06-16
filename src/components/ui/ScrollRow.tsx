import { useState, useEffect, useRef } from "react";

export function ScrollRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    rowRef.current?.scrollBy({ left: dir === "right" ? 600 : -600, behavior: "smooth" });
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    return () => el.removeEventListener("scroll", checkScroll);
  }, [children]);

  // ── Drag Handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!rowRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - rowRef.current.offsetLeft);
    setScrollLeft(rowRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !rowRef.current) return;
    e.preventDefault();
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Multiply for faster scrolling
    
    // If we move the mouse more than 5 pixels, count it as a drag (not a click)
    if (Math.abs(walk) > 5) setHasDragged(true);
    
    rowRef.current.scrollLeft = scrollLeft - walk;
  };

  // Prevent click events on children if the user was just dragging the row
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
      setHasDragged(false);
    }
  };

  return (
    <div className={`relative group/row ${className}`}>
      {canLeft && (
        <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-full bg-gradient-to-r from-[#141414] to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <span className="bg-black/70 hover:bg-white hover:text-black text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors">‹</span>
        </button>
      )}
      {canRight && (
        <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-full bg-gradient-to-l from-[#141414] to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <span className="bg-black/70 hover:bg-white hover:text-black text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors">›</span>
        </button>
      )}
      <div 
        ref={rowRef} 
        className={`flex overflow-x-auto gap-4 pb-3 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`} 
        style={{ scrollbarWidth: "none" }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
}