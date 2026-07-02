// src/components/details/DetailsCast.tsx
import { useNavigate } from "react-router-dom";
import ArrowRow from "./ArrowRow";
import SectionHeader from "./SectionHeader";

const SAFE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

interface DetailsCastProps {
  item: any;
  authData: any;
  anilistCast: any[] | null;
  anilistLoading: boolean;
  isAnime: boolean;
}

export default function DetailsCast({
  item,
  authData,
  anilistCast,
  anilistLoading,
  isAnime,
}: DetailsCastProps) {
  const navigate = useNavigate();

  // Deduplicate people by Id, merging roles/types
  const peopleToDisplay: any[] = item.People
    ? item.People.reduce((acc: any[], current: any) => {
        const existing = acc.find((p: any) => p.Id === current.Id);
        if (existing) {
          if (current.Type && !existing.allTypes.includes(current.Type)) existing.allTypes.push(current.Type);
          if (current.Role && !existing.allRoles.includes(current.Role)) existing.allRoles.push(current.Role);
        } else {
          acc.push({
            ...current,
            allTypes: current.Type ? [current.Type] : [],
            allRoles: current.Role ? [current.Role] : [],
          });
        }
        return acc;
      }, [])
    : [];

  if (anilistCast === null && peopleToDisplay.length === 0) return null;

  const sectionTitle = anilistCast !== null ? "Characters & Voices" : "Cast & Crew";

  return (
    <div className="mb-10" style={{ animation: "fadeSlideUp 0.5s 0.25s ease-out both" }}>
      <SectionHeader
        title={sectionTitle}
        subtitle={
          anilistCast !== null ? (
            <span className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-accent)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 px-1.5 py-0.5 rounded">
                AniList
              </span>
            </span>
          ) as any : undefined
        }
      />

      {/* ── AniList: character + VA stacked portrait style ── */}
      {anilistCast !== null ? (
        anilistLoading ? (
          <div className="flex gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-[110px] flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
                <div className="w-14 h-2 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <ArrowRow>
            {anilistCast.map((c: any, idx: number) => (
              <div
                key={idx}
                className="flex flex-col items-center w-[140px] flex-shrink-0 group/person"
                style={{ scrollSnapAlign: "start" }}
              >
                {/* VA behind, character in front */}
                <div className="relative w-24 h-24 mb-2.5">
                  <img
                    src={c.actorImage || SAFE_PLACEHOLDER}
                    className="absolute inset-0 w-full h-full rounded-full object-cover brightness-50 ring-2 ring-transparent group-hover/person:ring-[var(--color-accent)]/50 transition-all duration-300"
                    title={`VA: ${c.actorName}`}
                    onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                  />
                  <img
                    src={c.charImage || SAFE_PLACEHOLDER}
                    className="absolute bottom-0 right-0 w-[52px] h-[52px] rounded-full object-cover border-2 border-[#141414] shadow-xl z-10 group-hover/person:scale-110 transition-transform duration-300"
                    title={c.charName}
                    onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                  />
                </div>
                <span className="text-xs font-semibold text-white text-center w-full truncate leading-snug group-hover/person:text-[var(--color-accent)] transition-colors">
                  {c.charName}
                </span>
                <span className="text-[10px] text-gray-500 text-center w-full truncate mt-0.5">
                  {c.actorName}
                </span>
              </div>
            ))}
          </ArrowRow>
        )
      ) : (
        /* ── Standard Jellyfin cast with smart VA detection ── */
        <ArrowRow>
          {peopleToDisplay.map((person: any, idx: number) => {
            let typesArray = [...person.allTypes];
            const combinedRoles = person.allRoles.join(" ").toLowerCase();

            const hasVoiceRole =
              combinedRoles.includes("(voice)") ||
              combinedRoles.includes("voice") ||
              combinedRoles.includes("(va)") ||
              (typesArray.includes("Actor") && isAnime);

            if (hasVoiceRole) {
              if (!typesArray.includes("VoiceActor")) typesArray.push("VoiceActor");
              typesArray = typesArray.filter((t: string) => t !== "Actor");
            }

            const typesStr = Array.from(new Set(typesArray))
              .map((t: string) => t.replace(/([A-Z])/g, " $1").trim())
              .join(" • ");

            const rolesStr = person.allRoles.join(" / ");
            const isActorOrGuest =
              typesArray.includes("Actor") ||
              typesArray.includes("GuestStar") ||
              typesArray.includes("VoiceActor");

            return (
              <div
                key={`${person.Id}-${idx}`}
                className="flex flex-col items-center w-[140px] flex-shrink-0 group/person cursor-pointer"
                style={{ scrollSnapAlign: "start" }}
                onClick={() => navigate(`/person/${person.Id}`, { state: { person } })}
              >
                <div className="relative w-24 h-24 rounded-full overflow-hidden mb-2.5 ring-2 ring-transparent group-hover/person:ring-[var(--color-accent)]/50 transition-all duration-300 shadow-lg group-hover/person:shadow-[0_0_20px_var(--color-accent-glow)]">
                  <img
                    src={
                      person.PrimaryImageTag || person.ImageTags?.Primary
                        ? `${authData.serverUrl}/Items/${person.Id}/Images/Primary?fillHeight=200&fillWidth=200&quality=90&api_key=${authData.token}`
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(person.Name)}&background=2a2a2a&color=666&size=200`
                    }
                    alt={person.Name}
                    className="w-full h-full object-cover group-hover/person:scale-110 transition duration-300"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.Name)}&background=2a2a2a&color=666&size=200`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/person:opacity-100 transition-opacity duration-200 rounded-full gap-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-[9px] font-semibold text-white/80 uppercase tracking-wider">Profile</span>
                  </div>
                </div>

                <span className="text-xs font-semibold text-white text-center w-full truncate leading-snug group-hover/person:text-[var(--color-accent)] transition-colors">
                  {person.Name}
                </span>
                <span className="text-[11px] text-gray-400 font-medium text-center w-full truncate mt-0.5">
                  {typesStr}
                </span>
                {rolesStr && (
                  <span className="text-[10px] text-gray-500 italic text-center w-full truncate mt-0.5">
                    {isActorOrGuest ? `as ${rolesStr}` : rolesStr}
                  </span>
                )}
              </div>
            );
          })}
        </ArrowRow>
      )}
    </div>
  );
}