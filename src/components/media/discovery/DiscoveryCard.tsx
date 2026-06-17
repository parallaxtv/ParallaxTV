import { DiscoveryItem } from "../../../types/discovery";
import { MediaItem } from "../../../types/media";
import { ScoreBadge } from "./ScoreBadge";

const SAFE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

interface DiscoveryCardProps {
  item: DiscoveryItem;
  match?: MediaItem;
  onClick: () => void;
}

export function DiscoveryCard({ item, match, onClick }: DiscoveryCardProps) {
  const accent = item.accentColor || "#e50914";

  return (
    <div
      className="discovery-card flex-shrink-0 w-[175px] cursor-pointer group/card relative"
      style={{ scrollSnapAlign: "start", height: "310px" }}
      onClick={onClick}
    >
      {/* Poster — scale only this element, origin top */}
      <div
        className="relative w-full h-[263px] rounded-xl overflow-hidden bg-[#1c1c1c] shadow-lg
          transition-transform duration-300
          group-hover/card:scale-[1.05]
          group-hover/card:rounded-b-none
          group-hover/card:shadow-[0_16px_40px_rgba(0,0,0,0.9)]
          group-hover/card:z-30"
        style={{ transformOrigin: "top center", willChange: "transform" }}
      >
        <img
          src={item.posterUrl || SAFE_PLACEHOLDER}
          alt={item.title}
          className="w-full h-full object-cover transition-all duration-300 group-hover/card:brightness-50"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = SAFE_PLACEHOLDER;
          }}
        />

        {/* Score top-left */}
        {item.score && (
          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm rounded px-1.5 py-0.5 z-10">
            <ScoreBadge score={item.score} />
          </div>
        )}

        {/* TMDB rating for movies/kdrama */}
        {item.rating && !item.score && (
          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm rounded px-1.5 py-0.5 z-10 flex items-center gap-1">
            <svg className="w-2.5 h-2.5 fill-yellow-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-[11px] font-bold text-white tabular-nums">{item.rating}</span>
          </div>
        )}

        {/* Library dot top-right */}
        {match && (
          <div
            className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: accent }}
            title="In your library"
          >
            <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {/* Centre hover: play or More Info */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-20 pointer-events-none">
          {match ? (
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl">
              <svg className="w-6 h-6 fill-black translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          ) : (
            <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full shadow-xl">
              More Info
            </span>
          )}
        </div>

        {/* Bottom genre strip */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
        {item.genres && item.genres.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 z-10 pointer-events-none">
            {item.genres.slice(0, 2).map((g: string) => (
              <span
                key={g}
                className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 text-white/70"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Year drawer — floats outside flow */}
        {item.year && (
          <div
            className="card-drawer absolute left-0 right-0 bg-[#1c1c1c] border border-t-0 border-white/8 rounded-b-xl px-3 py-2 flex-col shadow-xl z-40"
            style={{ top: "100%" }}
          >
            <p className="text-[11px] text-gray-400 tabular-nums">{item.year}</p>
          </div>
        )}
      </div>

      {/* Below-card title + year — fixed in reserved space, fades on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-[47px] px-0.5 pt-2 group-hover/card:opacity-0 transition-opacity duration-200 pointer-events-none">
        <p className="text-[11px] font-semibold text-gray-300 truncate leading-snug">{item.title}</p>
        {item.year && <p className="text-[10px] text-gray-600 mt-0.5">{item.year}</p>}
      </div>
    </div>
  );
}