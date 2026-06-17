import { DiscoveryItem, DiscoveryDetail } from "../../../types/discovery";
import { ScoreBadge } from "./ScoreBadge";
import { DiscoveryCast } from "./DiscoveryCast";

const SAFE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

interface DiscoveryModalProps {
  selected: DiscoveryItem;
  detailData: DiscoveryDetail | null;
  detailLoading: boolean;
  trailerKey: string | null;
  onClose: () => void;
  onSimilarClick: (item: DiscoveryItem) => void;
  onPlayTrailer: () => void;
}

export function DiscoveryModal({
  selected,
  detailData,
  detailLoading,
  trailerKey,
  onClose,
  onSimilarClick,
  onPlayTrailer,
}: DiscoveryModalProps) {
  const accent = selected.accentColor || "#e50914";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-16"
      style={{ animation: "dFadeIn 0.18s ease-out" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#141414] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9)] border border-white/8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop */}
        <div className="relative h-44 md:h-60 flex-shrink-0 bg-[#1c1c1c] overflow-hidden">
          <img
            src={selected.backdropUrl || selected.posterUrl || SAFE_PLACEHOLDER}
            alt={selected.title}
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              e.currentTarget.src = SAFE_PLACEHOLDER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />

          {/* Close button */}
          <button
            className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-white text-white hover:text-black rounded-full flex items-center justify-center transition-all backdrop-blur-md z-50"
            onClick={onClose}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="absolute bottom-0 left-0 px-7 pb-4 pr-14">
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
              {selected.title}
            </h2>
            {selected.nativeTitle && selected.nativeTitle !== selected.title && (
              <p className="text-xs text-gray-500 mt-0.5">{selected.nativeTitle}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-7 overflow-y-auto scrollbar-hide flex flex-col gap-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            {selected.year && <span className="text-sm font-semibold text-gray-300">{selected.year}</span>}
            {detailData?.runtime && <span className="text-[11px] text-gray-500">{detailData.runtime}m</span>}
            {selected.score && (
              <span className="flex items-center gap-1 bg-white/6 border border-white/10 px-2 py-0.5 rounded text-[11px]">
                <ScoreBadge score={selected.score} />
              </span>
            )}
            {(detailData?.rating ?? selected.rating) && !selected.score && (
              <span className="flex items-center gap-1 bg-white/6 border border-white/10 px-2 py-0.5 rounded text-[11px]">
                <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-white font-bold tabular-nums">
                  {detailData?.rating ?? selected.rating}
                </span>
              </span>
            )}
            {selected.studio && (
              <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/8">
                {selected.studio}
              </span>
            )}
            {(detailData?.genres ?? selected.genres)?.map((g: string) => (
              <span
                key={g}
                className="text-[10px] uppercase tracking-wider text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/8"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Tagline */}
          {detailData?.tagline && <p className="text-xs text-gray-600 italic">"{detailData.tagline}"</p>}

          {/* Description */}
          {(detailData?.description ?? selected.description) && (
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">
              {detailData?.description ?? selected.description}
            </p>
          )}

          {/* Cast */}
          {detailLoading ? (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-3 h-px bg-red-600 inline-block" />
                Cast
              </p>
              <div className="flex gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[72px] flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
                    <div className="w-10 h-2 bg-white/5 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : detailData?.cast && detailData.cast.length > 0 ? (
            <DiscoveryCast cast={detailData.cast} />
          ) : selected.cast && selected.cast.length > 0 ? (
            <DiscoveryCast cast={selected.cast} />
          ) : null}

          {/* Action row */}
          <div className="pt-4 border-t border-white/8 flex items-center gap-3 flex-wrap">
            {trailerKey ? (
              <button
                onClick={onPlayTrailer}
                className="flex items-center gap-2 bg-white text-black text-sm font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-all shadow-lg"
              >
                <svg className="w-4 h-4 fill-black flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Trailer
              </button>
            ) : detailLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-600 animate-pulse">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                Loading trailer…
              </div>
            ) : null}
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              Not in your Jellyfin library
            </span>
          </div>

          {/* Similar titles */}
          {detailData?.similar && detailData.similar.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-3 h-px bg-red-600 inline-block" />
                More Like This
              </p>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {detailData.similar.map((s) => (
                  <div
                    key={s.id}
                    className="flex-shrink-0 w-[90px] cursor-pointer group/sim"
                    onClick={() => onSimilarClick(s)}
                  >
                    <div className="w-full h-[135px] rounded-lg overflow-hidden bg-white/5 mb-1.5 group-hover/sim:ring-1 group-hover/sim:ring-red-600 transition-all">
                      <img
                        src={s.posterUrl || SAFE_PLACEHOLDER}
                        className="w-full h-full object-cover group-hover/sim:brightness-75 transition-all"
                        onError={(e) => {
                          e.currentTarget.src = SAFE_PLACEHOLDER;
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 truncate group-hover/sim:text-white transition-colors">
                      {s.title}
                    </p>
                    {s.year && <p className="text-[9px] text-gray-700">{s.year}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}