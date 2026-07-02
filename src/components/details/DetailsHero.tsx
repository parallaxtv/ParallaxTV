import React from "react";
import { PlayButton } from "../ui/Buttons";
import { StarRating } from "../ui/StarRating";
import { FavoriteButton } from "../ui/FavoriteButton";
import TrailerPlayer from "./TrailerPlayer";

interface DetailsHeroProps {
  item: any;
  authData: any;
  trailerKey: string | null;
  showTrailer: boolean;
  onHideTrailer: () => void;
  onShowTrailer: () => void;
  playBtnText: string;
  onPlay: () => void;
  onToggleWatched: (e: React.MouseEvent) => void;
  runtime: string | null;
  isFavorite: boolean;
}

export default function DetailsHero({
  item,
  authData,
  trailerKey,
  showTrailer,
  onHideTrailer,
  onShowTrailer,
  playBtnText,
  onPlay,
  onToggleWatched,
  runtime,
  isFavorite,
}: DetailsHeroProps) {

  const typeLabel = item.Type === "Series" ? "TV Series" : "Movie";
  const metaParts = [
    item.ProductionYear ? String(item.ProductionYear) : null,
    runtime || null,
    item.OfficialRating || null,
    typeLabel,
  ].filter(Boolean) as string[];

  return (
    <>
      <div className="w-full h-[78vh] min-h-[600px] relative overflow-visible bg-transparent">

        {/* ── Seamless Masked Backdrop (Fixed z-index to z-0) ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          }}
        >
          <img
            src={`${authData.serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=1920&quality=92&api_key=${authData.token}`}
            alt={item.Name}
            className="w-full h-full object-cover object-top absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: showTrailer ? 0 : 1 }} // Set to 1 so the top hero image is bright and vibrant
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Trailer iframe + controls */}
        {trailerKey && (
          <div
            className="absolute inset-0 z-10 transition-opacity duration-1000 bg-black"
            style={{ opacity: showTrailer ? 1 : 0, pointerEvents: showTrailer ? "auto" : "none" }}
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
          className="absolute bottom-0 left-0 right-0 z-20 px-14 pb-16 pt-8 max-w-4xl"
          style={{ animation: "fadeSlideUp 0.5s ease-out both" }}
        >
          {item.ImageTags?.Logo ? (
            <img
              src={`${authData.serverUrl}/Items/${item.Id}/Images/Logo?fillWidth=800&quality=96&api_key=${authData.token}`}
              alt={item.Name}
              className="mb-8 w-auto max-w-[460px] max-h-[160px] object-contain object-left drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]"
              style={{ animation: "logoFloat 12s ease-in-out infinite" }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <h1 className="text-6xl md:text-7xl font-black text-white mb-8 drop-shadow-2xl leading-tight tracking-tight"
                style={{ animation: "logoFloat 12s ease-in-out infinite" }}>
              {item.Name}
            </h1>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-6 text-[14px] text-gray-400 font-medium tracking-wide drop-shadow-md">
            {item.CommunityRating && (
              <>
                <div className="flex items-center gap-1.5 font-bold text-[15px]">
                  <StarRating rating={item.CommunityRating} voteCount={item.VoteCount} />
                </div>
                {metaParts.length > 0 && <span className="text-white/20">|</span>}
              </>
            )}
            {metaParts.map((part, i) => (
              <React.Fragment key={part + i}>
                {i > 0 && <span className="text-white/20">|</span>}
                <span className="text-gray-300">{part}</span>
              </React.Fragment>
            ))}
          </div>

          {item.Genres?.length > 0 && (
            <p className="text-[13px] text-gray-500 tracking-wider mb-8 uppercase font-semibold drop-shadow-md">
              {item.Genres.slice(0, 4).join("   ·   ")}
            </p>
          )}

          <div className="flex items-center gap-4 mt-8">
            <PlayButton large onClick={onPlay}>{playBtnText}</PlayButton>

            {trailerKey && !showTrailer && (
              <div className="relative flex-shrink-0 w-12 h-12 group">
                <button
                  onClick={onShowTrailer}
                  className="absolute inset-0 flex items-center justify-center w-12 h-12 rounded-full bg-black/40 text-white/80 border border-white/20 hover:bg-white/10 hover:text-white hover:border-white/50 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                  aria-label="Watch trailer"
                >
                  <svg
                    className="w-[19px] h-[19px] text-white/90 drop-shadow-md"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m12.296 3.464 3.02 3.956" />
                    <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" />
                    <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <path d="m6.18 5.276 3.1 3.899" />
                  </svg>
                  <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/90 text-white text-[10px] font-bold px-2.5 py-1.5 rounded tracking-wider whitespace-nowrap pointer-events-none border border-white/10 shadow-xl">
                    Watch Trailer
                  </span>
                </button>
              </div>
            )}

            <FavoriteButton
              itemId={item.Id}
              isFavorite={isFavorite}
              authData={authData}
              variant="hero"
            />

            <button
              onClick={onToggleWatched}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300 backdrop-blur-md shadow-lg hover:scale-105 active:scale-95
                ${item.UserData?.Played
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/50 shadow-[0_0_20px_var(--color-accent-glow)]"
                  : "bg-black/40 text-white/80 border-white/20 hover:bg-white/10 hover:text-white hover:border-white/50"
                }`}
            >
              {item.UserData?.Played ? (
                <svg className="w-5 h-5 drop-shadow-[0_0_8px_var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/90 text-white text-[10px] font-bold px-2.5 py-1.5 rounded tracking-wider whitespace-nowrap pointer-events-none border border-white/10 shadow-xl">
                {item.UserData?.Played ? "Mark Unwatched" : "Mark Watched"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}