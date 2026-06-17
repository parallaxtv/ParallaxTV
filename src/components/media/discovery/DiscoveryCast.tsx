import { DiscoveryCast as CastType } from "../../../types/discovery";

const SAFE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

export function DiscoveryCast({ cast }: { cast: any[] }) {
  if (!cast?.length) return null;

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <span className="w-3 h-px bg-red-600 inline-block" />
        Cast
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {cast.map((c, i) => {
          // Detect if it's the Anime format or the TMDB format
          const isAnime = Boolean(c.actorName || c.charName);

          const mainImage = isAnime ? c.actorImage : c.profileUrl;
          const subImage = isAnime ? c.charImage : null;
          
          const topText = isAnime ? c.charName : c.name;
          const bottomText = isAnime ? c.actorName : c.character;

          return (
            <div key={i} className="flex-shrink-0 w-[72px] md:w-[84px] flex flex-col items-center text-center">
              
              {isAnime ? (
                // ── Anime Style: Dual circular images ──
                <div className="relative w-14 h-14 mb-2">
                  <img
                    src={mainImage || SAFE_PLACEHOLDER}
                    className="absolute inset-0 w-full h-full rounded-full object-cover brightness-60 border-2 border-[#1a1a1a]"
                    title={bottomText}
                    onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                    alt={bottomText || "Actor"}
                  />
                  <img
                    src={subImage || SAFE_PLACEHOLDER}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full object-cover border-2 border-[#141414] shadow-lg z-10"
                    title={topText}
                    onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                    alt={topText || "Character"}
                  />
                </div>
              ) : (
                // ── TMDB Style: Single circular image ──
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden mb-1.5 md:mb-2 bg-white/5 ring-1 ring-white/10">
                  <img
                    src={mainImage || SAFE_PLACEHOLDER}
                    className="w-full h-full object-cover"
                    title={topText}
                    onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                    alt={topText || "Actor"}
                  />
                </div>
              )}

              {/* Names */}
              <span className="text-[10px] font-semibold text-white leading-tight line-clamp-1 w-full">
                {topText}
              </span>
              {bottomText && (
                <span className="text-[9px] text-gray-500 leading-tight line-clamp-1 w-full mt-0.5">
                  {bottomText}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}