// src/components/ui/FavoriteButton.tsx
import { useFavorite } from "../../hooks/useFavorite";
import { AuthData } from "../../types/auth";

interface FavoriteButtonProps {
  itemId: string | undefined;
  isFavorite: boolean;
  authData: AuthData;
  /**
   * "hero" — 48px circular icon button, matches the Trailer/Watched buttons in DetailsHero
   * "card" — small corner badge for PosterCard / Top10Card, visible on hover
   */
  variant?: "hero" | "card";
  onToggle?: (newState: boolean) => void;
  className?: string;
}

export function FavoriteButton({
  itemId,
  isFavorite: initialState,
  authData,
  variant = "hero",
  onToggle,
  className = "",
}: FavoriteButtonProps) {
  const { isFavorite, isPending, handleToggle } = useFavorite({
    itemId,
    initialState,
    authData,
    onToggle,
  });

  if (variant === "card") {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        className={`absolute top-2 right-2 z-20 flex items-center justify-center w-7 h-7 rounded-full
          backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-110
          ${isFavorite
            ? "bg-red-600/90 hover:bg-red-700"
            : "bg-black/60 hover:bg-black/80 border border-white/20"}
          ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${className}`}
      >
        <HeartIcon filled={isFavorite} size={13} />
      </button>
    );
  }

  // hero variant — same 48px circular shape & tooltip pattern as the Watched / Trailer buttons
  return (
    <div className="relative flex-shrink-0 w-12 h-12 group">
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        className={`flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300
          backdrop-blur-sm shadow-lg hover:scale-105
          ${isFavorite
            ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            : "bg-black/40 text-white/80 border-white/30 hover:bg-black/70 hover:text-white hover:border-white/60"}
          ${isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
          ${className}`}
      >
        <HeartIcon filled={isFavorite} size={20} />
      </button>
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-200
        bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider whitespace-nowrap pointer-events-none">
        {isFavorite ? "Remove Favorite" : "Add to Favorites"}
      </span>
    </div>
  );
}

// ── HeartIcon ─────────────────────────────────────────────────────────────────

function HeartIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}