import { useSettings } from "../../store/settings";
import {
  SettingsSection, SettingsRow, Toggle, RadioGroup,
} from "./SettingsPrimitives";

// ─── DiscoverySettings ────────────────────────────────────────────────────────

export function DiscoverySettings() {
  const {
    trendingSource,  setTrendingSource,
    showAnime,       setShowAnime,
    showKDrama,      setShowKDrama,
    showMovies,      setShowMovies,
    hideNSFWAnime,   setHideNSFWAnime,
  } = useSettings();

  return (
    <>
      <SettingsSection title="Trending source">
        <SettingsRow
          label="Data source"
          description="Where global trending data is pulled from on the dashboard"
        >
          <RadioGroup
            value={trendingSource}
            onChange={setTrendingSource}
            options={[
              { value: "tmdb",     label: "TMDB" },
              { value: "anilist",  label: "AniList" },
              { value: "combined", label: "Combined" },
            ]}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Dashboard rows">
        <SettingsRow
          label="Show trending movies"
          description="Displays the worldwide movie trending row"
        >
          <Toggle value={showMovies} onChange={setShowMovies} />
        </SettingsRow>

        <SettingsRow
          label="Show trending anime"
          description="Displays anime trending and seasonal rows"
        >
          <Toggle value={showAnime} onChange={setShowAnime} />
        </SettingsRow>

        <SettingsRow
          label="Show trending K-Dramas"
          description="Displays the K-Drama trending row"
        >
          <Toggle value={showKDrama} onChange={setShowKDrama} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Content filters">
        <SettingsRow
          label="Hide NSFW anime"
          description="Filters adult-rated titles from AniList discovery rows"
        >
          <Toggle value={hideNSFWAnime} onChange={setHideNSFWAnime} />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}