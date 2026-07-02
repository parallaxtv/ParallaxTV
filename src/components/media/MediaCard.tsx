import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";
import { MediaItem } from "../../types/media";
import { formatRuntime } from "../../utils/time";
import { getPrimaryImage, getBackdropImage } from "../../utils/images";
import { isEpisode, isMovie } from "../../utils/media";
import { FavoriteButton } from "../ui/FavoriteButton";

// ─── Landscape card — Standard ───────────────────────────────────────────────

export function LandscapeCard({ item, authData }: { item: MediaItem; authData: AuthData }) {
  const navigate = useNavigate();
  const episode = isEpisode(item);
  const movie   = isMovie(item);

  const topLabel = episode ? (item.SeriesName ?? item.Name) : item.Name;
  const subLabel = episode
    ? `S${item.ParentIndexNumber ?? "?"} E${item.IndexNumber ?? "?"} · ${item.Name ?? ""}`
    : (item.ProductionYear ? String(item.ProductionYear) : "");

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
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1A1A24] mb-3 shadow-lg border border-white/5 group-hover:border-white/10 transition-colors">
        <img
          src={primarySrc}
          alt={topLabel}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-50"
          onError={(e) => {
            if (fallbackSrc && e.currentTarget.src !== fallbackSrc)
              e.currentTarget.src = fallbackSrc;
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button onClick={handlePlay} className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white hover:text-black hover:scale-110 rounded-full flex items-center justify-center shadow-2xl transition-all" title="Play">
            <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>

        {item.RunTimeTicks && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded z-10">
            {formatRuntime(item.RunTimeTicks)}
          </div>
        )}
      </div>

      <div className="px-1">
        <p className="text-gray-200 text-sm font-semibold truncate group-hover:text-white transition-colors">{topLabel}</p>
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
      className="flex-shrink-0 w-[150px] md:w-[170px] cursor-pointer group"
      style={{ scrollSnapAlign: "start" }}
      onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
    >
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1A24] mb-3 shadow-lg border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-1">
        <img
          src={getPrimaryImage(authData, item.Id, 340)}
          alt={item.Name}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-50"
          onError={(e) => {
            e.currentTarget.src = getBackdropImage(authData, item.Id, 340);
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center shadow-2xl">
            <svg className="w-5 h-5 fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>

        {/* Favorite toggle — top-right */}
        <FavoriteButton
          itemId={item.Id}
          isFavorite={item.UserData?.IsFavorite ?? false}
          authData={authData}
          variant="card"
          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2"
        />

        {item.CommunityRating && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded z-10">
            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[10px] font-bold text-white">{item.CommunityRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <p className="text-gray-300 text-[13px] font-bold truncate px-1 group-hover:text-white transition-colors">
        {item.Name}
      </p>
      {item.ProductionYear && (
        <p className="text-gray-500 text-[11px] px-1 mt-0.5">{item.ProductionYear} • {item.Type === "Series" ? "TV Show" : "Movie"}</p>
      )}
    </div>
  );
}

// ─── Horizontal Trending Card — Top 10 ────────────────────────────────────────

export function Top10Card({ item, rank, authData }: { item: MediaItem; rank: number; authData: AuthData }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex-shrink-0 w-[190px] md:w-[220px] cursor-pointer group overflow-hidden rounded-lg border border-white/8 bg-[#0b0f14] shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 relative"
      style={{ scrollSnapAlign: "start" }}
      onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-lg">
        <img
          src={getPrimaryImage(authData, item.Id, 640)}
          alt={item.Name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-lg"
          onError={(e) => {
            e.currentTarget.src = getBackdropImage(authData, item.Id, 640);
          }}
        />

        <div className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-sm font-bold text-white shadow-sm">
          {rank}
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-20">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
            Top 10
          </div>
          <p className="mt-2 text-[14px] font-semibold leading-tight text-white line-clamp-2">
            {item.Name}
          </p>
        </div>
      </div>
    </div>
  );
}