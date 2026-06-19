// src/components/details/DetailsHero.tsx
import { useNavigate } from "react-router-dom";
import { PlayButton } from "../ui/Buttons";
import { StarRating } from "../ui/StarRating";
import { FavoriteButton } from "../ui/FavoriteButton";
import TrailerPlayer from "./TrailerPlayer";
import logo from "../../assets/parallaxtv_logo.svg";

interface DetailsHeroProps {
  item: any;
  authData: any;
  // Trailer state
  trailerKey: string | null;
  showTrailer: boolean;
  trailerCountdown: number;
  onHideTrailer: () => void;
  onCancelCountdown: () => void;
  onShowTrailer: () => void;
  // Actions
  playBtnText: string;
  onPlay: () => void;
  onToggleWatched: (e: React.MouseEvent) => void;
  runtime: string | null;
  // Favorites
  isFavorite: boolean;
}

export default function DetailsHero({
  item,
  authData,
  trailerKey,
  showTrailer,
  trailerCountdown,
  onHideTrailer,
  onCancelCountdown,
  onShowTrailer,
  playBtnText,
  onPlay,
  onToggleWatched,
  runtime,
  isFavorite,
}: DetailsHeroProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* ── Floating header ─────────────────────────────────────────────── */}
      <div className="fixed top-8 left-0 right-0 z-50 flex items-center justify-between px-10 pt-5 pb-10 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex items-center gap-2 text-sm font-semibold text-white/80
            hover:text-white bg-black/50 hover:bg-black/80 px-4 py-2 rounded-full
            border border-white/10 hover:border-white/30 transition-all backdrop-blur-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <img
          src={logo}
          alt="Parallax TV"
          className="h-6 w-auto drop-shadow-md pointer-events-none"
        />
      </div>

      {/* ── Hero backdrop + trailer ──────────────────────────────────────── */}
      <div className="w-full h-[78vh] relative overflow-hidden">
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-black/20 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/30 to-transparent z-10 pointer-events-none" />

        {/* Backdrop image */}
        <img
          src={`${authData.serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=1920&quality=92&api_key=${authData.token}`}
          alt={item.Name}
          className="w-full h-full object-cover object-top absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: showTrailer ? 0 : 1 }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = "none";
          }}
        />

        {/* Trailer iframe + controls */}
        {trailerKey && (
          <div
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: showTrailer ? 1 : 0 }}
          >
            {showTrailer && (
              <TrailerPlayer
                trailerKey={trailerKey}
                onHide={onHideTrailer}
              />
            )}
          </div>
        )}

        {/* ── Hero content ─────────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 z-20 px-12 pb-12 max-w-2xl"
          style={{ animation: "fadeSlideUp 0.5s ease-out both" }}
        >
          {/* Logo or title */}
          {item.ImageTags?.Logo ? (
            <img
              src={`${authData.serverUrl}/Items/${item.Id}/Images/Logo?fillWidth=500&quality=96&api_key=${authData.token}`}
              alt={item.Name}
              className="mb-5 w-auto max-w-sm max-h-32 object-contain drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <h1 className="text-5xl font-black text-white mb-5 drop-shadow-lg leading-tight tracking-tight">
              {item.Name}
            </h1>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <StarRating rating={item.CommunityRating} voteCount={item.VoteCount} />
            {item.OfficialRating && (
              <span className="border border-gray-500/70 text-gray-300 px-2 py-0.5 rounded text-[11px] font-mono tracking-wider">
                {item.OfficialRating}
              </span>
            )}
            {item.ProductionYear && (
              <span className="text-gray-300 text-sm">{item.ProductionYear}</span>
            )}
            {runtime && (
              <span className="text-gray-400 text-sm">{runtime}</span>
            )}
            <span className="bg-white/10 text-white/60 text-[11px] px-2.5 py-0.5 rounded-full font-semibold tracking-wider uppercase">
              {item.Type === "Series" ? "TV Show" : "Movie"}
            </span>
          </div>

          {/* Genre pills */}
          {item.Genres?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {item.Genres.slice(0, 4).map((g: string) => (
                <span key={g} className="text-[11px] text-gray-400 px-3 py-0.5 rounded-full border border-white/10 bg-white/5">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <PlayButton large onClick={onPlay}>{playBtnText}</PlayButton>

            {/* Favorite button */}
            <FavoriteButton
              itemId={item.Id}
              isFavorite={isFavorite}
              authData={authData}
              variant="hero"
            />

            {/* Trailer button with countdown ring */}
            {trailerKey && !showTrailer && (
              <div className="relative flex-shrink-0 w-12 h-12 group">
                {trailerCountdown > 0 && trailerCountdown < 100 && (
                  <svg
                    className="absolute inset-0 w-12 h-12 -rotate-90 pointer-events-none"
                    viewBox="0 0 48 48"
                    style={{ zIndex: 1 }}
                  >
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none"
                      stroke="#e50914"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - trailerCountdown / 100)}`}
                      style={{ transition: "stroke-dashoffset 0.05s linear" }}
                    />
                  </svg>
                )}
                <button
                  onClick={() => {
                    if (trailerCountdown > 0 && trailerCountdown < 100) {
                      onCancelCountdown();
                    } else {
                      onShowTrailer();
                      onCancelCountdown();
                    }
                  }}
                  className="absolute inset-0 flex items-center justify-center w-12 h-12 rounded-full
                    bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40
                    backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
                  style={{ zIndex: 2 }}
                  aria-label="Play trailer"
                >
                  {trailerCountdown > 0 && trailerCountdown < 100 ? (
                    <>
                      <svg className="w-4 h-4 text-white group-hover:opacity-0 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      <svg className="w-4 h-4 text-white absolute opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider whitespace-nowrap pointer-events-none">
                    {trailerCountdown > 0 && trailerCountdown < 100 ? "Cancel auto-play" : "Play Trailer"}
                  </span>
                </button>
              </div>
            )}

            {/* Mark watched button */}
            <button
              onClick={onToggleWatched}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300 backdrop-blur-sm shadow-lg hover:scale-105
                ${item.UserData?.Played
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  : "bg-black/40 text-white/80 border-white/30 hover:bg-black/70 hover:text-white hover:border-white/60"
                }`}
            >
              {item.UserData?.Played ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider whitespace-nowrap pointer-events-none">
                {item.UserData?.Played ? "Mark Unwatched" : "Mark Watched"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}