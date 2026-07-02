import { useEffect, useState } from "react";
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
import { Sidebar, Icons }     from "../components/ui/Sidebar"; 

export function Details({ authData, onLogout }: { authData: any; onLogout: () => void }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id: routeItemId } = useParams();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!routeItemId) navigate("/dashboard");
  }, [routeItemId, navigate]);

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

  const {
    trailerKey,
    showTrailer,
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
    <div className="relative flex h-screen text-white overflow-hidden bg-black animate-[fadeIn_0.35s_ease-out]">
      
      {/* ── Full-Page Glass Backdrop (Fixed z-index to z-0) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={`${authData.serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=1920&quality=92&api_key=${authData.token}`}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{
            filter: "blur(48px) saturate(1.5) brightness(0.45)", 
            objectPosition: "center top",
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar 
        authData={authData} 
        onLogout={onLogout} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
      />

      {/* Main Container (Fixed z-index to z-10) */}
      <main className="flex-1 flex flex-col relative z-10 h-screen overflow-y-auto scrollbar-hide">
        
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="xl:hidden absolute top-6 right-6 z-50 p-2 text-white/80 hover:text-white bg-black/40 rounded-lg backdrop-blur-md border border-white/10 shadow-lg"
          aria-label="Open menu"
        >
          <Icons.Menu />
        </button>

        <DetailsHero
          item={item}
          authData={authData}
          trailerKey={trailerKey}
          showTrailer={showTrailer}
          onHideTrailer={hideTrailer}
          onShowTrailer={showTrailerNow}
          playBtnText={playBtnText}
          onPlay={handleHeroPlay}
          onToggleWatched={handleToggleMainItemWatched}
          runtime={runtime}
          isFavorite={item.UserData?.IsFavorite ?? false}
        />

        <div className="px-14 pb-24 relative z-20">
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
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}