import { useSettings } from "../../store/settings";
import {
  SettingsSection, SettingsRow, RadioGroup, Toggle,
} from "./SettingsPrimitives";

// ─── AppearanceSettings ───────────────────────────────────────────────────────

export function AppearanceSettings() {
  const {
    theme,            setTheme,
    cardStyle,        setCardStyle,
    animationsEnabled,setAnimationsEnabled,
    backdropBlur,     setBackdropBlur,
  } = useSettings();

  return (
    <>
      <SettingsSection title="Theme">
        <SettingsRow
          label="Color scheme"
          description="Controls the overall background darkness and accent tones"
        >
          <RadioGroup
            value={theme}
            onChange={setTheme}
            options={[
              { value: "dark",     label: "Dark" },
              { value: "amoled",   label: "AMOLED" },
              { value: "midnight", label: "Midnight Blue" },
            ]}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Cards">
        <SettingsRow
          label="Card style"
          description="Changes how media cards look across rows and grids"
        >
          <RadioGroup
            value={cardStyle}
            onChange={setCardStyle}
            options={[
              { value: "netflix",  label: "Netflix" },
              { value: "plex",     label: "Plex" },
              { value: "compact",  label: "Compact" },
            ]}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Motion & effects">
        <SettingsRow
          label="Enable animations"
          description="Page transitions, card hover effects, and row reveals"
        >
          <Toggle value={animationsEnabled} onChange={setAnimationsEnabled} />
        </SettingsRow>

        <SettingsRow
          label="Backdrop blur"
          description="Frosted glass effect on the header and dropdown menus"
        >
          <Toggle value={backdropBlur} onChange={setBackdropBlur} />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}