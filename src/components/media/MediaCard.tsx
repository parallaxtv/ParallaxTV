import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";
import { MediaItem } from "../../types/media";
import { formatRuntime } from "../../utils/time";
import { getPrimaryImage, getBackdropImage } from "../../utils/images";
import { isEpisode, isMovie } from "../../utils/media";
import { FavoriteButton } from "../ui/FavoriteButton";

// ─── Landscape card — Continue Watching ──────────────────────────────────────

export function LandscapeCard({ item, authData }: { item: MediaItem; authData: AuthData }) {
  const navigate = useNavigate();

  const episode = isEpisode(item);
  const movie   = isMovie(item);
  const isResuming = (item.UserData?.PlaybackPositionTicks ?? 0) > 0;

  const progressPct = item.UserData?.PlaybackPositionTicks && item.RunTimeTicks
    ? Math.min((item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100, 100)
    : 0;

  // ── Labels ────────────────────────────────────────────────────────────────
  const topLabel = episode ? (item.SeriesName ?? item.Name) : item.Name;
  const subLabel = episode
    ? `S${item.ParentIndexNumber ?? "?"} E${item.IndexNumber ?? "?"} · ${item.Name ?? ""}`
    : (item.ProductionYear ? String(item.ProductionYear) : "");

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  const primarySrc = episode && item.Id
    ? getPrimaryImage(authData, item.Id, 560)
    : getBackdropImage(authData, item.Id, 560);

  const fallbackSrc = episode && item.SeriesId
    ? getBackdropImage(authData, item.SeriesId, 560)
    : null;

  const handleClick = () => {
    if (movie) navigate(`/title/${item.Id}`, { state: { item } });
    else {
      const detailsId = item.SeriesId || item.Id;
      navigate(`/title/${detailsId}`, {
        state: { item: { Id: detailsId, Name: item.SeriesName || item.Name, Type: "Series" } },
      });
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/play/${item.Id}`, { state: { item } });
  };

  return (
    <div
      className="flex-shrink-0 w-[280px] cursor-pointer group"
      style={{ scrollSnapAlign: "start" }}
      onClick={handleClick}
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1c1c1c] mb-2.5 shadow-lg">
        <img
          src={primarySrc}
          alt={topLabel}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-70"
          onError={(e) => {
            if (fallbackSrc && e.currentTarget.src !== fallbackSrc)
              e.currentTarget.src = fallbackSrc;
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button onClick={handlePlay} className="w-12 h-12 bg-white hover:bg-white/90 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110" title="Play">
            <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>

        {isResuming && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider z-10">
            Resume
          </div>
        )}

        {item.RunTimeTicks && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded z-10">
            {formatRuntime(item.RunTimeTicks)}
          </div>
        )}

        {progressPct > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-700/80 z-10">
            <div className="h-full bg-red-600" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      <div className="px-0.5">
        <p className="text-white text-xs font-semibold truncate leading-snug">{topLabel}</p>
        <p className="text-gray-500 text-[11px] truncate mt-0.5">{subLabel}</p>
      </div>
    </div>
  );
}

// ─── Poster card — My List / Recently Added ───────────────────────────────────

export function PosterCard({ item, authData }: { item: MediaItem; authData: AuthData }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex-shrink-0 w-[150px] cursor-pointer group"
      style={{ scrollSnapAlign: "start" }}
      onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
    >
      <div className="relative w-full h-[225px] rounded-xl overflow-hidden bg-[#1c1c1c] mb-2.5 shadow-lg">
        <img
          src={getPrimaryImage(authData, item.Id, 300)}
          alt={item.Name}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-75"
          onError={(e) => {
            e.currentTarget.src = getBackdropImage(authData, item.Id, 300);
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
            <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>

        {/* Favorite toggle — top-right, visible on hover */}
        <FavoriteButton
          itemId={item.Id}
          isFavorite={item.UserData?.IsFavorite ?? false}
          authData={authData}
          variant="card"
          className="opacity-0 group-hover:opacity-100"
        />

        {item.CommunityRating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            <svg className="w-3 h-3 fill-yellow-400 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[10px] font-bold text-white">{item.CommunityRating.toFixed(1)}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider z-10">
          {item.Type === "Series" ? "Show" : "Film"}
        </div>
      </div>

      <p className="text-gray-300 text-[11px] font-semibold truncate px-0.5 group-hover:text-white transition-colors">
        {item.Name}
      </p>
      {item.ProductionYear && (
        <p className="text-gray-600 text-[10px] px-0.5 mt-0.5">{item.ProductionYear}</p>
      )}
    </div>
  );
}

// ─── Top 10 card — big rank number + poster ───────────────────────────────────

export function Top10Card({ item, rank, authData }: { item: MediaItem; rank: number; authData: AuthData }) {
  const navigate = useNavigate();
  const rankStr = String(rank);
  const isDoubleDigit = rank >= 10;

  return (
    <div
      className="flex-shrink-0 cursor-pointer group"
      style={{ scrollSnapAlign: "start", width: isDoubleDigit ? "200px" : "185px" }}
      onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
    >
      <div className="relative flex items-end">
        <div
          className="flex-shrink-0 font-black text-transparent select-none leading-none z-10"
          style={{
            fontSize: "clamp(80px, 10vw, 110px)",
            WebkitTextStroke: "2px rgba(255,255,255,0.25)",
            marginRight: isDoubleDigit ? "-18px" : "-14px",
            marginBottom: "-4px",
            letterSpacing: "-4px",
          }}
        >
          {rankStr}
        </div>

        <div className="relative flex-shrink-0 w-[130px] h-[195px] rounded-xl overflow-hidden bg-[#1c1c1c] shadow-xl z-20 transition-all duration-300 group-hover:scale-[1.04] group-hover:shadow-2xl">
          <img
            src={getPrimaryImage(authData, item.Id, 260)}
            alt={item.Name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-75"
            onError={(e) => {
              e.currentTarget.src = getBackdropImage(authData, item.Id, 260);
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
              <svg className="w-4 h-4 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>

          {/* Favorite toggle — top-right, visible on hover */}
          <FavoriteButton
            itemId={item.Id}
            isFavorite={item.UserData?.IsFavorite ?? false}
            authData={authData}
            variant="card"
            className="opacity-0 group-hover:opacity-100"
          />
        </div>
      </div>

      <p className="text-gray-400 text-[11px] font-semibold truncate mt-2 group-hover:text-white transition-colors"
        style={{ paddingLeft: isDoubleDigit ? "4px" : "0" }}>
        {item.Name}
      </p>
    </div>
  );
}