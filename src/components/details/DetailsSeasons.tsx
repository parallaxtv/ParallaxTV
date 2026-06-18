// src/components/details/DetailsSeasons.tsx
import ArrowRow from "./ArrowRow";
import SectionHeader from "./SectionHeader";

interface DetailsSeasonsProps {
  item: any;
  authData: any;
  seasons: any[];
  selectedSeasonId: string;
  onSelectSeason: (id: string) => void;
  onToggleWatched: (e: React.MouseEvent, itemId: string, currentlyWatched: boolean, type: "Season") => void;
}

export default function DetailsSeasons({
  item,
  authData,
  seasons,
  selectedSeasonId,
  onSelectSeason,
  onToggleWatched,
}: DetailsSeasonsProps) {
  if (item.Type !== "Series" || seasons.length === 0) return null;

  return (
    <div className="mb-8" style={{ animation: "fadeSlideUp 0.5s 0.15s ease-out both" }}>
      <SectionHeader title="Seasons" subtitle={seasons.length} />
      <ArrowRow>
        {seasons.map((season) => {
          const isSelected = season.Id === selectedSeasonId;
          const isSeasonPlayed = season.UserData?.Played;

          return (
            <div
              key={season.Id}
              onClick={() => onSelectSeason(season.Id)}
              className="flex-shrink-0 w-[150px] cursor-pointer group/season relative"
              style={{ scrollSnapAlign: "start" }}
            >
              <div
                className={`rounded-xl overflow-hidden transition-all duration-300
                  ${isSelected
                    ? "scale-[1.06] shadow-[0_8px_32px_rgba(0,0,0,0.7)] ring-2 ring-red-600"
                    : "scale-100 hover:scale-[1.03] opacity-50 hover:opacity-80 ring-1 ring-white/5"
                  }`}
              >
                <img
                  src={`${authData.serverUrl}/Items/${season.Id}/Images/Primary?fillHeight=340&fillWidth=220&quality=94&api_key=${authData.token}`}
                  alt={season.Name}
                  className="w-full h-[220px] object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `${authData.serverUrl}/Items/${item.Id}/Images/Primary?fillHeight=340&fillWidth=220&quality=94&api_key=${authData.token}`;
                  }}
                />

                {isSeasonPlayed && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 backdrop-blur-sm z-10 group-hover/season:opacity-0 transition-opacity duration-200">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Hover overlay with toggle-watched button */}
                <div className="absolute inset-0 opacity-0 group-hover/season:opacity-100 transition-opacity duration-200 z-20 flex flex-col justify-start p-2 pointer-events-none">
                  <div className="flex justify-end pointer-events-auto">
                    <button
                      onClick={(e) => onToggleWatched(e, season.Id, isSeasonPlayed, "Season")}
                      className="w-8 h-8 bg-black/50 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-110"
                    >
                      {isSeasonPlayed ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active indicator */}
              <div className={`mt-2.5 mx-auto transition-all duration-300 ${isSelected ? "w-8 h-0.5 bg-red-600 rounded-full" : "w-0 h-0.5"}`} />

              <p className={`mt-1.5 text-center text-xs font-semibold truncate px-1 transition-colors duration-300 ${isSelected ? "text-white" : "text-gray-600 group-hover/season:text-gray-400"}`}>
                {season.Name}
              </p>
            </div>
          );
        })}
      </ArrowRow>
    </div>
  );
}