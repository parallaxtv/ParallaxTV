import { useState, useEffect } from "react";
import { useSettings, HeroContentType, HeroTimeRange } from "../../store/settings";
import {
  SettingsSection, SettingsRow, Toggle, RadioGroup,
} from "./SettingsPrimitives";
import { AuthData } from "../../types/auth"; 

// ─── HeroBannerSettings ───────────────────────────────────────────────────────

const RATING_OPTIONS = [
  { value: "0",   label: "Any rating" },
  { value: "6",   label: "6.0+" },
  { value: "7",   label: "7.0+" },
  { value: "8",   label: "8.0+" },
];

const TIME_RANGE_OPTIONS: { value: HeroTimeRange; label: string }[] = [
  { value: "all",     label: "All time" },
  { value: "year",    label: "Last 12 months" },
  { value: "6months", label: "Last 6 months" },
  { value: "month",   label: "This month" },
];

export function HeroBannerSettings({ authData }: { authData: AuthData }) {
  const {
    heroMinRating,     setHeroMinRating,
    heroContentTypes,  setHeroContentTypes,
    heroLibraryIds,    setHeroLibraryIds,
    heroUseFallbackLibraries, setHeroUseFallbackLibraries,
    heroOnlyTrending,  setHeroOnlyTrending,
    heroTimeRange,     setHeroTimeRange,
  } = useSettings();

  const [libraries, setLibraries] = useState<any[]>([]);

  useEffect(() => {
    if (!authData) return;
    async function loadLibraries() {
      try {
        const res = await fetch(
          `${authData.serverUrl}/Users/${authData.userId}/Views?api_key=${authData.token}`
        );
        const data = await res.json();
        const validLibs = (data.Items ?? []).filter((l: any) =>
          !["livetv", "channels", "music", "playlists", "boxsets"].includes(
            l.CollectionType?.toLowerCase() ?? ""
          )
        );
        setLibraries(validLibs);
      } catch (err) {
        console.error("Failed to fetch libraries for settings", err);
      }
    }
    loadLibraries();
  }, [authData]);

  function toggleContentType(type: HeroContentType, enabled: boolean) {
    if (enabled) {
      if (!heroContentTypes.includes(type)) setHeroContentTypes([...heroContentTypes, type]);
    } else {
      setHeroContentTypes(heroContentTypes.filter((t) => t !== type));
    }
  }

  function toggleLibrary(id: string, enabled: boolean) {
    const currentIds = heroLibraryIds || [];
    if (enabled) {
      if (!currentIds.includes(id)) setHeroLibraryIds([...currentIds, id]);
    } else {
      setHeroLibraryIds(currentIds.filter((libId) => libId !== id));
    }
  }

  function toggleFallbackLibraries(enabled: boolean) {
    setHeroUseFallbackLibraries(enabled);
    if (enabled) {
      setHeroContentTypes([]);
    } else {
      setHeroLibraryIds([]);
    }
  }

  return (
    <>
      <SettingsSection title="Auto Content Types">
        <SettingsRow label="Movies" description="Automatically detect and include movies">
          <Toggle value={heroContentTypes.includes("movies")} onChange={(v) => toggleContentType("movies", v)} />
        </SettingsRow>
        <SettingsRow label="TV Shows" description="Automatically detect and include TV series">
          <Toggle value={heroContentTypes.includes("shows")} onChange={(v) => toggleContentType("shows", v)} />
        </SettingsRow>
        <SettingsRow label="Anime" description="Automatically detect anime based on genre metadata">
          <Toggle value={heroContentTypes.includes("anime")} onChange={(v) => toggleContentType("anime", v)} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Fallback Libraries (Optional)">
        <SettingsRow label="Use fallback libraries only" description="Turn this on to ignore auto content types and pull titles only from the libraries you select below">
          <Toggle value={heroUseFallbackLibraries} onChange={toggleFallbackLibraries} />
        </SettingsRow>
        {libraries.length === 0 ? (
          <div className="text-gray-500 text-[13px] p-5">Loading libraries...</div>
        ) : (
          <div className="flex flex-col gap-4 p-5">
            <p className="text-[13.5px] text-gray-400 leading-relaxed">
              Select specific libraries to include in the hero banner. This is useful if titles are missing metadata and aren't caught by the Auto Content Types above.
            </p>
            {/* Horizontal flex container for library chips */}
            <div className="flex flex-wrap gap-2.5">
              {libraries.map((lib) => {
                const isSelected = (heroLibraryIds || []).includes(lib.Id);
                return (
                  <button
                    key={lib.Id}
                    onClick={() => toggleLibrary(lib.Id, !isSelected)}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 outline-none ${
                      isSelected
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10"
                    }`}
                  >
                    {lib.Name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Rating filter">
        <SettingsRow label="Minimum rating" description="Only show titles in the hero banner at or above this community rating">
          <RadioGroup value={String(heroMinRating)} onChange={(v) => setHeroMinRating(Number(v))} options={RATING_OPTIONS} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Release window">
        <SettingsRow label="Release date" description="Only show titles released within this window in the hero banner">
          <RadioGroup value={heroTimeRange} onChange={setHeroTimeRange} options={TIME_RANGE_OPTIONS} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Selection">
        <SettingsRow label="Only show trending titles" description="Restrict the hero banner to highly-rated trending picks, instead of mixing in recently added titles">
          <Toggle value={heroOnlyTrending} onChange={setHeroOnlyTrending} />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}