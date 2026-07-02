import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models";
import { createJellyfinApi } from "../lib/jellyfinApi";

// Import the logo
import logo from "../assets/parallaxtv_logo.svg";

const SAFE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20fill%3D%22%232a2a2a%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E";

// ─── AniList Staff Enrichment ─────────────────────────────────────────────────
function stripHtml(html: string) {
  return html?.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

interface AniListStaff {
  id: number;
  name: string;
  nativeName: string | null;
  image: string | null;
  bio: string | null;
  birthDate: string | null;
  bloodType: string | null;
  homeTown: string | null;
  yearsActive: string | null;
  roles: {
    charName: string;
    charImage: string | null;
    mediaTitle: string;
    mediaImage: string | null;
    mediaId: number;
  }[];
}

async function fetchAniListStaff(name: string): Promise<AniListStaff | null> {
  const cleanName = name.replace(/\(.*?\)/g, "").trim();
  if (!cleanName) return null;

  console.log("Searching AniList for:", cleanName);

  const query = `
    query ($search: String) {
      Staff(search: $search) {
        id
        name { full native }
        image { large }
        description(asHtml: false)
        dateOfBirth { year month day }
        bloodType
        homeTown
        yearsActive
        characters(perPage: 12, sort: [FAVOURITES_DESC]) {
          edges {
            node { name { full } image { large } }
            media {
              edges {
                node { title { english romaji } coverImage { medium } id }
              }
            }
          }
        }
      }
    }`;
    
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: cleanName } }),
    });
    
    // ── FIX #2: Graceful 404 Handling ──
    if (!res.ok) {
      if (res.status === 404) {
        return null; // Not found on AniList, silently fail (expected behavior)
      }
      console.error("AniList Error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    console.log("AniList Result:", data);

    const s = data?.data?.Staff;
    if (!s) return null;

    const dob = s.dateOfBirth;
    let birthDate: string | null = null;
    if (dob?.year && dob?.month && dob?.day) {
      birthDate = new Date(dob.year, dob.month - 1, dob.day)
        .toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } else if (dob?.month && dob?.day) {
      birthDate = new Date(2000, dob.month - 1, dob.day)
        .toLocaleDateString(undefined, { month: "long", day: "numeric" });
    }

    return {
      id: s.id,
      name: s.name?.full ?? name,
      nativeName: s.name?.native ?? null,
      image: s.image?.large ?? null,
      bio: s.description ? stripHtml(s.description) : null,
      birthDate,
      bloodType: s.bloodType ?? null,
      homeTown: s.homeTown ?? null,
      yearsActive: s.yearsActive?.length ? s.yearsActive.join("–") : null,
      roles: (s.characters?.edges ?? []).slice(0, 12).map((e: any) => {
        const media = e.media?.edges?.[0]?.node;
        return {
          charName: e.node?.name?.full ?? "Unknown",
          charImage: e.node?.image?.large ?? null,
          mediaTitle: media?.title?.english || media?.title?.romaji || "Unknown",
          mediaImage: media?.coverImage?.medium ?? null,
          mediaId: media?.id ?? 0,
        };
      }),
    };
  } catch (err) {
    console.error("Fetch AniList Staff Exception:", err);
    return null;
  }
}

// ─── Expandable Biography ─────────────────────────────────────────────────────
function ExpandableText({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const CHAR_LIMIT = 280;
  const isLong = text.length > CHAR_LIMIT;
  const displayed = !isLong || expanded ? text : text.slice(0, CHAR_LIMIT).trimEnd() + "…";

  return (
    <div className="max-w-3xl mt-4">
      <p className="text-sm leading-relaxed text-gray-300 drop-shadow-md">
        {displayed}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs font-bold text-white/60 hover:text-white transition-colors group uppercase tracking-wider"
        >
          {expanded ? "Show less" : "Read more"}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function PersonPage({ authData }: { authData: any }) {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();
  const location  = useLocation();
  const basicPerson = location.state?.person;

  const [personDetails, setPersonDetails] = useState<any>(null);
  const [works, setWorks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"All" | "Movie" | "Series">("All");
  const [aniStaff, setAniStaff] = useState<AniListStaff | null | "idle">("idle");
  
  const aniListFetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!authData?.serverUrl || !authData?.token || !id) return;
    setLoading(true);

    async function loadData() {
      try {
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const itemsApi = getItemsApi(api);
        
        const [personRes, worksRes] = await Promise.all([
          itemsApi.getItems({
            userId: authData.userId,
            ids: [id!],
            fields: ["Overview", "PremiereDate", "ImageTags"] as any,
          }),
          itemsApi.getItems({
            userId:           authData.userId,
            personIds:        [id!],
            recursive:        true,
            includeItemTypes: ["Movie", "Series"],
            sortBy:           ["PremiereDate"],
            sortOrder:        [SortOrder.Descending],
            fields:           ["Overview", "CommunityRating", "ImageTags", "ProductionYear", "Genres"] as any,
            limit:            100,
          })
        ]);

        if (personRes.data.Items && personRes.data.Items.length > 0) {
          setPersonDetails(personRes.data.Items[0]);
        }
        setWorks(worksRes.data.Items ?? []);
      } catch (err) {
        console.error("Failed to load person data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [authData?.serverUrl, authData?.token, authData?.userId, id]);

  useEffect(() => {
    const name = personDetails?.Name ?? basicPerson?.Name;
    if (!name || loading) return; 

    // ── FIX #3: Skip Studios & Animation Houses ──
    const nameLower = name.toLowerCase();
    if (
      nameLower.includes("studio") ||
      nameLower.includes("works") ||
      nameLower.includes("production") ||
      nameLower.includes("animation")
    ) {
      return;
    }

    if (aniListFetchedRef.current.has(name)) return;
    aniListFetchedRef.current.add(name);

    const typesArr: string[] = basicPerson?.allTypes ?? (basicPerson?.Type ? [basicPerson.Type] : []);
    const roles = (basicPerson?.allRoles ?? []).join(" ").toLowerCase();

    // ── FIX #1: Strict VA Detection ──
    const isVA =
      typesArr.includes("VoiceActor") ||
      roles.includes("voice") ||
      roles.includes("(va)");

    if (!isVA) return;

    setAniStaff(null);
    fetchAniListStaff(name).then(result => {
      setAniStaff(result ?? "idle");
    });

  }, [personDetails?.Name, basicPerson?.Name, loading, basicPerson]);

  const filtered = filter === "All" ? works : works.filter(w => w.Type === filter);

  const activePerson = personDetails || basicPerson || {};
  const personName = activePerson.Name ?? "Unknown Person";
  const hasPhoto   = activePerson.PrimaryImageTag || activePerson.ImageTags?.Primary;
  const photoSrc   = hasPhoto
    ? `${authData.serverUrl}/Items/${id}/Images/Primary?fillHeight=600&fillWidth=400&quality=96&api_key=${authData.token}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(personName)}&background=2a2a2a&color=666&size=400`;

  const birthDate = activePerson.PremiereDate 
    ? new Date(activePerson.PremiereDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  let professionsStr = "";
  let typesArray: string[] = [];

  if (basicPerson?.allTypes?.length > 0) {
    typesArray = [...basicPerson.allTypes];
  } else if (basicPerson?.Type && basicPerson.Type !== "Person") {
    typesArray = [basicPerson.Type];
  }

  let displayTypes = [...typesArray];

  // ── Smart Voice Actor Detection ──
  // Three independent signals — any one is sufficient to promote Actor → Voice Actor.
  //
  // Signal 1: Role string contains an explicit voice marker.
  //   Jellyfin stores "Loaf (voice)" or similar for Western animated films.
  const combinedRoles = (basicPerson?.allRoles ?? []).join(" ").toLowerCase();
  const roleSignalsVoice =
    combinedRoles.includes("(voice)") ||
    combinedRoles.includes("voice") ||
    combinedRoles.includes("(va)");

  // Signal 2: DetailsCast already promoted them to VoiceActor when navigating
  //   from an anime/animation detail page.
  const alreadyTaggedVA = displayTypes.includes("VoiceActor");

  // Signal 3: Their works are predominantly animated/anime.
  //   Jellyfin stores Type="Actor" for Japanese VA's with no "(voice)" in the role
  //   field — the only reliable signal is the genres of their filmography.
  //   Threshold: ≥60% of works with a known genre are Animation or Anime.
  const worksWithGenres = works.filter(w => w.Genres?.length > 0);
  const animatedWorks   = worksWithGenres.filter(w =>
    w.Genres.some((g: string) => /anime|animation/i.test(g))
  );
  const worksSignalVoice =
    worksWithGenres.length > 0 &&
    animatedWorks.length / worksWithGenres.length >= 0.6;

  if (displayTypes.includes("Actor") && (roleSignalsVoice || alreadyTaggedVA || worksSignalVoice)) {
    // Promote Actor → VoiceActor; preserve any other types (Director, Writer, etc.)
    displayTypes = displayTypes.map((t) => (t === "Actor" ? "VoiceActor" : t));
  }

  if (displayTypes.length > 0) {
    professionsStr = Array.from(new Set(displayTypes))
      .map((t: string) => t.replace(/([A-Z])/g, " $1").trim())
      .join(" • ");
  }

  console.log({
    person: personName,
    jellyfinTypes: typesArray,
    aniStaff,
    professionsStr,
  });

  const rolesStr = basicPerson?.allRoles?.join(" / ");

  return (
    <div className="min-h-screen bg-[#141414] text-white animate-[fadeIn_0.35s_ease-out]">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="fixed top-8 left-0 right-0 z-50 flex items-center justify-between
        px-10 pt-5 pb-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex items-center gap-2 text-sm font-semibold
            text-white/80 hover:text-white bg-black/50 hover:bg-black/80 px-4 py-2
            rounded-full border border-white/10 hover:border-white/30 transition-all backdrop-blur-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Browse
        </button>
        <img 
          src={logo} 
          alt="Parallax TV" 
          className="h-6 w-auto drop-shadow-md pointer-events-none" 
        />
      </div>

      {/* ── Immersive Hero Section ────────────────────────────────────────── */}
      <div className="relative pt-28 px-12 pb-14 min-h-[45vh] flex flex-col justify-end overflow-hidden">
        
        {/* Blurred Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={photoSrc} 
            alt="background blur" 
            className="w-full h-[70vh] object-cover opacity-30 blur-3xl scale-110 saturate-50"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/50 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-end gap-10" style={{ animation: "fadeSlideUp 0.5s ease-out both" }}>
          
          {/* Main Photo */}
          <div className="flex-shrink-0 w-40 h-60 md:w-56 md:h-80 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10">
            <img
              src={photoSrc}
              alt={personName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(personName)}&background=2a2a2a&color=666&size=400`;
              }}
            />
          </div>

          {/* Info */}
          <div className="pb-2 flex-1">
            {professionsStr && (
              <p className="text-[var(--color-accent)] text-xs font-bold uppercase tracking-[0.3em] mb-2 drop-shadow">
                {professionsStr}
              </p>
            )}
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-3 drop-shadow-lg">
              {personName}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300 drop-shadow-md mb-2">
              {rolesStr && (
                <span>As: <span className="text-white font-bold">{rolesStr}</span></span>
              )}
              {birthDate && (
                <>
                  {rolesStr && <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
                  <span>Born: {birthDate}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Strip ────────────────────────────────────────────────────── */}
      {!loading && works.length > 0 && (
        <div
          className="px-12 py-6 relative z-10 border-y border-white/5"
          style={{ animation: "fadeSlideUp 0.5s 0.1s ease-out both" }}
        >
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white tabular-nums">{works.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-0.5">Total Titles</span>
            </div>
            {works.filter(w => w.Type === "Movie").length > 0 && (
              <>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-white tabular-nums">{works.filter(w => w.Type === "Movie").length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-0.5">Movies</span>
                </div>
              </>
            )}
            {works.filter(w => w.Type === "Series").length > 0 && (
              <>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-white tabular-nums">{works.filter(w => w.Type === "Series").length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-0.5">Series</span>
                </div>
              </>
            )}
            {professionsStr && (
              <>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white">{professionsStr}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-0.5">Role</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Known For ─────────────────────────────────────────────────────── */}
      {aniStaff !== "idle" && aniStaff !== null && aniStaff.roles.length > 0 && (
        <div
          className="px-12 pt-10 pb-4 relative z-10"
          style={{ animation: "fadeSlideUp 0.5s 0.15s ease-out both" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-5">Known For</p>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {aniStaff.roles.slice(0, 8).map((role, i) => (
              <div key={i} className="flex-shrink-0 w-[160px] group">
                <div className="relative w-full h-[100px] rounded-xl overflow-hidden mb-2.5 bg-white/5">
                  {role.charImage ? (
                    <img
                      src={role.charImage}
                      alt={role.charName}
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => { e.currentTarget.src = SAFE_PLACEHOLDER; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-bold truncate leading-tight">{role.charName}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-[11px] truncate font-medium">{role.mediaTitle}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Biography ─────────────────────────────────────────────────────── */}
      {(() => {
        const bioText = aniStaff !== "idle" && aniStaff !== null && aniStaff.bio
          ? aniStaff.bio
          : activePerson.Overview;
        if (!bioText) return null;
        return (
          <div
            className="px-12 pt-8 pb-4 relative z-10"
            style={{ animation: "fadeSlideUp 0.5s 0.2s ease-out both" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-3">Biography</p>
            <ExpandableText text={bioText} />
          </div>
        );
      })()}

      {/* ── Filmography Header + Filter pills ─────────────────────────────── */}
      <div className="px-12 pt-10 pb-3 relative z-10" style={{ animation: "fadeSlideUp 0.5s 0.25s ease-out both" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-5">Filmography</p>
        <div className="flex items-center gap-3">
          {(["All", "Movie", "Series"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg border
                ${filter === f
                  ? "bg-white text-black border-white scale-105"
                  : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/15 hover:text-white"
                }`}
            >
              {f === "All" ? `All Work (${works.length})` :
               f === "Movie" ? `Movies (${works.filter(w => w.Type === "Movie").length})` :
               `Series (${works.filter(w => w.Type === "Series").length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Works grid ────────────────────────────────────────────────────── */}
      <div className="px-12 py-6 pb-24 relative z-10" style={{ animation: "fadeSlideUp 0.5s 0.3s ease-out both" }}>
        {loading ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="w-full h-[240px] rounded-xl bg-white/5 animate-pulse mb-3"/>
                <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-2"/>
                <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-gray-500 text-lg font-semibold mb-2">Nothing found</p>
            <p className="text-gray-700 text-sm">No {filter === "All" ? "works" : filter === "Movie" ? "movies" : "TV shows"} in your library</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {filtered.map(work => (
              <div
                key={work.Id}
                className="cursor-pointer group relative"
                onClick={() => navigate(`/title/${work.Id}`, { state: { item: work } })}
              >
                <div className="relative w-full h-[240px] rounded-xl overflow-hidden
                  bg-[#1c1c1c] mb-2.5 shadow-lg transition-all duration-300
                  group-hover:scale-[1.05] group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.8)] group-hover:ring-2 ring-white/20">
                  <img
                    src={`${authData.serverUrl}/Items/${work.Id}/Images/Primary?fillHeight=450&fillWidth=300&quality=92&api_key=${authData.token}`}
                    alt={work.Name}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-[0.4] group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = SAFE_PLACEHOLDER;
                    }}
                  />

                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 scale-90 group-hover:scale-100">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                      <svg className="w-6 h-6 fill-black ml-1" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Rating */}
                  {work.CommunityRating && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1
                      bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
                      <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-[10px] font-bold text-white">
                        {work.CommunityRating.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm
                    text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider z-10">
                    {work.Type === "Series" ? "Show" : "Film"}
                  </div>
                </div>

                <p className="text-gray-300 text-sm font-semibold truncate px-0.5
                  group-hover:text-white transition-colors">
                  {work.Name}
                </p>
                {work.ProductionYear && (
                  <p className="text-gray-500 text-xs px-0.5 mt-0.5">{work.ProductionYear}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}