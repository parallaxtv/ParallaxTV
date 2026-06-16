import { useNavigate } from "react-router-dom";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRuntime(ticks: number): string {
  const m = Math.floor(ticks / 600_000_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function imgUrl(
  serverUrl: string, token: string, id: string,
  type: "Primary" | "Backdrop" | "Thumb", w: number, h?: number
) {
  const p = h ? `fillWidth=${w}&fillHeight=${h}` : `fillWidth=${w}`;
  return `${serverUrl}/Items/${id}/Images/${type}?${p}&quality=92&api_key=${token}`;
}

// ─── Landscape card — Continue Watching ──────────────────────────────────────

export function LandscapeCard({ item, authData }: { item: any; authData: any }) {
  const navigate = useNavigate();

  const isEpisode = item.Type === "Episode" || Boolean(item.SeriesId);
  const isMovie   = item.Type === "Movie";
  const isResuming = (item.UserData?.PlaybackPositionTicks ?? 0) > 0;

  const progressPct = item.UserData?.PlaybackPositionTicks && item.RunTimeTicks
    ? Math.min((item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100, 100)
    : 0;

  // ── Labels ────────────────────────────────────────────────────────────────
  // Top line: Series name (for episodes) or Movie title
  const topLabel = isEpisode
    ? (item.SeriesName ?? item.Name)
    : item.Name;

  // Sub line: "S1 E3 · Episode Title" for episodes, year for movies
  const subLabel = isEpisode
    ? `S${item.ParentIndexNumber ?? "?"} E${item.IndexNumber ?? "?"} · ${item.Name ?? ""}`
    : (item.ProductionYear ? String(item.ProductionYear) : "");

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  // Episodes: try episode Primary (thumb), fall back to series Backdrop
  // Movies: use Backdrop
  const primarySrc = isEpisode && item.Id
    ? imgUrl(authData.serverUrl, authData.token, item.Id, "Primary", 560, 315)
    : imgUrl(authData.serverUrl, authData.token, item.Id, "Backdrop", 560, 315);

  const fallbackSrc = isEpisode && item.SeriesId
    ? imgUrl(authData.serverUrl, authData.token, item.SeriesId, "Backdrop", 560, 315)
    : null;

  const handleClick = () => {
    if (isMovie) navigate(`/title/${item.Id}`, { state: { item } });
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
      {/* Thumbnail */}
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

        {/* Hover play */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button onClick={handlePlay} className="w-12 h-12 bg-white hover:bg-white/90 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110" title="Play">
            <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>

        {/* Resume badge */}
        {isResuming && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider z-10">
            Resume
          </div>
        )}

        {/* Runtime */}
        {item.RunTimeTicks && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded z-10">
            {formatRuntime(item.RunTimeTicks)}
          </div>
        )}

        {/* Progress bar */}
        {progressPct > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-700/80 z-10">
            <div className="h-full bg-red-600" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="px-0.5">
        <p className="text-white text-xs font-semibold truncate leading-snug">{topLabel}</p>
        <p className="text-gray-500 text-[11px] truncate mt-0.5">{subLabel}</p>
      </div>
    </div>
  );
}

// ─── Poster card — My List / Recently Added ───────────────────────────────────

export function PosterCard({ item, authData }: { item: any; authData: any }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex-shrink-0 w-[150px] cursor-pointer group"
      style={{ scrollSnapAlign: "start" }}
      onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
    >
      <div className="relative w-full h-[225px] rounded-xl overflow-hidden bg-[#1c1c1c] mb-2.5 shadow-lg">
        <img
          src={imgUrl(authData.serverUrl, authData.token, item.Id, "Primary", 300, 450)}
          alt={item.Name}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-75"
          onError={(e) => {
            e.currentTarget.src = imgUrl(authData.serverUrl, authData.token, item.Id, "Backdrop", 300, 450);
          }}
        />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
            <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>

        {/* Rating */}
        {item.CommunityRating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            <svg className="w-3 h-3 fill-yellow-400 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[10px] font-bold text-white">{item.CommunityRating.toFixed(1)}</span>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider z-10">
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

export function Top10Card({ item, rank, authData }: { item: any; rank: number; authData: any }) {
  const navigate = useNavigate();

  // Rank number font: huge, outlined/stroke style
  const rankStr = String(rank);
  const isDoubleDigit = rank >= 10;

  return (
    <div
      className="flex-shrink-0 cursor-pointer group"
      style={{ scrollSnapAlign: "start", width: isDoubleDigit ? "200px" : "185px" }}
      onClick={() => navigate(`/title/${item.Id}`, { state: { item } })}
    >
      <div className="relative flex items-end">

        {/* Big rank number — outlined, partially behind poster */}
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

        {/* Poster */}
        <div className="relative flex-shrink-0 w-[130px] h-[195px] rounded-xl overflow-hidden bg-[#1c1c1c] shadow-xl z-20
          transition-all duration-300 group-hover:scale-[1.04] group-hover:shadow-2xl">
          <img
            src={imgUrl(authData.serverUrl, authData.token, item.Id, "Primary", 260, 390)}
            alt={item.Name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-75"
            onError={(e) => {
              e.currentTarget.src = imgUrl(authData.serverUrl, authData.token, item.Id, "Backdrop", 260, 390);
            }}
          />

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
              <svg className="w-4 h-4 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Title below */}
      <p className="text-gray-400 text-[11px] font-semibold truncate mt-2 group-hover:text-white transition-colors"
        style={{ paddingLeft: isDoubleDigit ? "4px" : "0" }}>
        {item.Name}
      </p>
    </div>
  );
}
