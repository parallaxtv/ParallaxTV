import { useState } from "react";
import { useSettings } from "../../store/settings";
import { SettingsSection, SettingsRow, DangerButton } from "./SettingsPrimitives";
import logo from "../../assets/parallaxtv_logo.svg";

function IconExternal() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function Credit({ name, role, href }: { name: string; role: string; href: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm text-white font-medium">{name}</p>
        <p className="text-[12px] text-gray-600">{role}</p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
      >
        Visit <IconExternal />
      </a>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 last:border-0">
      <p className="text-sm text-white font-medium">{label}</p>
      <p className="text-[13px] text-gray-400">{value}</p>
    </div>
  );
}

function LinkButton({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[13px] font-medium rounded-md transition-colors"
    >
      {label} <IconExternal />
    </a>
  );
}

export function AboutSettings() {
  const { resetAll } = useSettings();
  const [resetDone, setResetDone] = useState(false);

  function handleReset() {
    resetAll();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  }

  return (
    <>
      {/* Logo + version */}
      <div className="mb-8">
        <img src={logo} alt="ParallaxTV" className="h-10 w-auto mb-2" />
        <p className="text-gray-600 text-sm">Version v0.1.1-alpha</p>
      </div>

      <SettingsSection title="About ParallaxTV">
        <InfoRow label="Created by" value="iiTzMYUNG" />
        <InfoRow label="Built with" value="Tauri • React • TypeScript • MPV" />
        <InfoRow label="Open Source" value="AGPL-3.0" />
      </SettingsSection>

      <SettingsSection title="Powered by">
        <Credit name="Jellyfin" role="Media server & streaming backend"  href="https://jellyfin.org" />
        <Credit name="TMDB"     role="Trending movies & TV data"          href="https://www.themoviedb.org" />
        <Credit name="AniList"  role="Anime metadata & discovery"         href="https://anilist.co" />
        <Credit name="MPV"      role="Playback engine"                    href="https://mpv.io" />
      </SettingsSection>

      <SettingsSection title="Links">
        <div className="px-5 py-4 flex items-center gap-3">
          <LinkButton label="GitHub Repository" href="https://github.com/parallaxtv/ParallaxTV" />
          <LinkButton label="Support Development" href="https://ko-fi.com/iitzmyung" />
        </div>
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <SettingsRow
          label="Reset all settings"
          description="Restores every setting to its default value"
          danger
        >
          <DangerButton
            label={resetDone ? "Reset!" : "Reset settings"}
            onClick={handleReset}
          />
        </SettingsRow>
      </SettingsSection>

      <p className="text-[11px] text-gray-800 mt-4">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </>
  );
}