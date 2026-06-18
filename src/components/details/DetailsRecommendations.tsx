// src/components/details/DetailsRecommendations.tsx
import { useNavigate } from "react-router-dom";
import ArrowRow from "./ArrowRow";
import SectionHeader from "./SectionHeader";

const SAFE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

interface DetailsRecommendationsProps {
  authData: any;
  items: any[];
}

export default function DetailsRecommendations({ authData, items }: DetailsRecommendationsProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="mb-14" style={{ animation: "fadeSlideUp 0.5s 0.3s ease-out both" }}>
      <SectionHeader title="More Like This" subtitle={items.length} />
      <ArrowRow>
        {items.map((related) => (
          <div
            key={related.Id}
            className="flex-shrink-0 w-[160px] cursor-pointer group/related"
            style={{ scrollSnapAlign: "start" }}
            onClick={() => navigate(`/title/${related.Id}`, { state: { item: related } })}
          >
            <div className="relative rounded-xl overflow-hidden mb-2.5 shadow-lg transition-all duration-300 group-hover/related:scale-[1.04] group-hover/related:shadow-2xl">
              <img
                src={`${authData.serverUrl}/Items/${related.Id}/Images/Primary?fillHeight=360&fillWidth=240&quality=92&api_key=${authData.token}`}
                alt={related.Name}
                className="w-full h-[240px] object-cover transition-all duration-300 group-hover/related:brightness-75"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = SAFE_PLACEHOLDER;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/related:opacity-100 transition-opacity duration-200">
                <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                  <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              {related.CommunityRating && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <span className="text-[10px] font-bold text-white">{related.CommunityRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-300 truncate px-0.5 group-hover/related:text-white transition-colors leading-snug">
              {related.Name}
            </p>
            {related.ProductionYear && (
              <p className="text-[11px] text-gray-600 px-0.5 mt-0.5">{related.ProductionYear}</p>
            )}
          </div>
        ))}
      </ArrowRow>
    </div>
  );
}