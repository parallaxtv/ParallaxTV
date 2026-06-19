// pages/Details.tsx
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// Hooks
import { useDetails }  from "../hooks/useDetails";
import { useTrailer }  from "../hooks/useTrailer";

// Components
import DetailsHero            from "../components/details/DetailsHero";
import DetailsOverview        from "../components/details/DetailsOverview";
import DetailsSeasons         from "../components/details/DetailsSeasons";
import DetailsEpisodes        from "../components/details/DetailsEpisodes";
import DetailsCast            from "../components/details/DetailsCast";
import DetailsRecommendations from "../components/details/DetailsRecommendations";

export function Details({ authData }: { authData: any }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id: routeItemId } = useParams();

  // Guard: no id → go home
  useEffect(() => {
    if (!routeItemId) navigate("/dashboard");
  }, [routeItemId, navigate]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    item,
    seasons,
    selectedSeasonId,
    episodes,
    nextUp,
    isEpisodesLoading,
    moreLikeThis,
    anilistCast,
    anilistLoading,
    setSelectedSeasonId,
    handleToggleWatched,
    handleToggleMainItemWatched,
    handleRemoveProgress,
  } = useDetails(routeItemId, authData, location.state?.item);

  // ── Trailer ───────────────────────────────────────────────────────────────
  const {
    trailerKey,
    showTrailer,
    trailerCountdown,
    cancelCountdown,
    hideTrailer,
    showTrailerNow,
  } = useTrailer({
    itemId:         item?.Id,
    itemName:       item?.Name,
    itemType:       item?.Type,
    genres:         item?.Genres,
    providerIds:    item?.ProviderIds,
    remoteTrailers: item?.RemoteTrailers,
  });

  if (!item) return null;

  // ── Derived values ────────────────────────────────────────────────────────
  const runtime = item.RunTimeTicks
    ? (() => {
        const m = Math.round(item.RunTimeTicks / 600_000_000);
        return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
      })()
    : null;

  let playBtnText = "Play";
  if (item.Type === "Series" && nextUp) {
    playBtnText = nextUp.UserData?.PlaybackPositionTicks > 0
      ? `Resume S${nextUp.ParentIndexNumber} E${nextUp.IndexNumber}`
      : `Play S${nextUp.ParentIndexNumber} E${nextUp.IndexNumber}`;
  } else if (item.Type === "Movie" && item.UserData?.PlaybackPositionTicks > 0) {
    playBtnText = "Resume";
  }

  const handleHeroPlay = () => {
    if (item.Type === "Series") {
      if (nextUp) {
        navigate(`/play/${nextUp.Id}`, { state: { item: nextUp } });
      } else if (episodes.length > 0) {
        navigate(`/play/${episodes[0].Id}`, { state: { item: episodes[0] } });
      }
    } else {
      navigate(`/play/${item.Id}`, { state: { item } });
    }
  };

  const isAnime = item.Genres?.some((g: string) => /anime|animation/i.test(g)) ?? false;

  return (
    <div className="min-h-screen bg-[#141414] text-white overflow-y-auto animate-[fadeIn_0.35s_ease-out]">

      <DetailsHero
        item={item}
        authData={authData}
        trailerKey={trailerKey}
        showTrailer={showTrailer}
        trailerCountdown={trailerCountdown}
        onHideTrailer={hideTrailer}
        onCancelCountdown={cancelCountdown}
        onShowTrailer={showTrailerNow}
        playBtnText={playBtnText}
        onPlay={handleHeroPlay}
        onToggleWatched={handleToggleMainItemWatched}
        runtime={runtime}
        // ── Favorites ──────────────────────────────────────────────────────
        isFavorite={item.UserData?.IsFavorite ?? false}
      />

      <div className="px-12 pb-24 -mt-2 relative z-20">
        <DetailsOverview text={item.Overview} />

        <DetailsSeasons
          item={item}
          authData={authData}
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onSelectSeason={setSelectedSeasonId}
          onToggleWatched={handleToggleWatched}
        />

        <DetailsEpisodes
          item={item}
          authData={authData}
          episodes={episodes}
          selectedSeasonId={selectedSeasonId}
          nextUp={nextUp}
          isLoading={isEpisodesLoading}
          onToggleWatched={handleToggleWatched}
          onRemoveProgress={handleRemoveProgress}
        />

        <DetailsCast
          item={item}
          authData={authData}
          anilistCast={anilistCast}
          anilistLoading={anilistLoading}
          isAnime={isAnime}
        />

        <DetailsRecommendations
          authData={authData}
          items={moreLikeThis}
        />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}