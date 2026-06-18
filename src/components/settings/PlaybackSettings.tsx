import { useSettings } from "../../store/settings";
import {
  SettingsSection, SettingsRow, Toggle, Slider, Select,
} from "./SettingsPrimitives";

const LANG_OPTIONS = [
  { value: "off",      label: "Off" },
  { value: "original", label: "Original" },
  { value: "en",       label: "English" },
  { value: "ja",       label: "Japanese" },
  { value: "ko",       label: "Korean" },
  { value: "fr",       label: "French" },
  { value: "de",       label: "German" },
  { value: "es",       label: "Spanish" },
  { value: "pt",       label: "Portuguese" },
  { value: "zh",       label: "Chinese" },
];

const AUDIO_OPTIONS = LANG_OPTIONS.filter(l => l.value !== "off");

// ─── PlaybackSettings ─────────────────────────────────────────────────────────

export function PlaybackSettings() {
  const {
    defaultVolume,       setDefaultVolume,
    autoPlayNext,        setAutoPlayNext,
    autoSkipIntro,       setAutoSkipIntro,
    autoSkipOutro,       setAutoSkipOutro,
    rememberSpeed,       setRememberSpeed,
    defaultSubtitleLang, setDefaultSubtitleLang,
    defaultAudioLang,    setDefaultAudioLang,
  } = useSettings();

  return (
    <>
      <SettingsSection title="Volume">
        <SettingsRow label="Default volume" description="Starting volume when a video opens">
          <Slider
            value={defaultVolume}
            min={0}
            max={100}
            step={5}
            onChange={setDefaultVolume}
            formatLabel={(v) => `${v}%`}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Episode behavior">
        <SettingsRow
          label="Auto-play next episode"
          description="Queues the next episode when one finishes"
        >
          <Toggle value={autoPlayNext} onChange={setAutoPlayNext} />
        </SettingsRow>

        <SettingsRow
          label="Auto-skip intros"
          description="Jumps past the intro sequence if timestamps are available"
        >
          <Toggle value={autoSkipIntro} onChange={setAutoSkipIntro} />
        </SettingsRow>

        <SettingsRow
          label="Auto-skip outros"
          description="Skips the credits roll and post-credit bumper"
        >
          <Toggle value={autoSkipOutro} onChange={setAutoSkipOutro} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Speed & language">
        <SettingsRow
          label="Remember playback speed"
          description="Keeps your last-used speed across sessions"
        >
          <Toggle value={rememberSpeed} onChange={setRememberSpeed} />
        </SettingsRow>

        <SettingsRow
          label="Default subtitle language"
          description="Preferred subtitle track when a video loads"
        >
          <Select
            value={defaultSubtitleLang}
            onChange={setDefaultSubtitleLang}
            options={LANG_OPTIONS}
          />
        </SettingsRow>

        <SettingsRow
          label="Default audio language"
          description="Preferred audio track when a video loads"
        >
          <Select
            value={defaultAudioLang}
            onChange={setDefaultAudioLang}
            options={AUDIO_OPTIONS}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}