import { useState } from "react";
import { AuthData } from "../../types/auth";
import {
  SettingsSection, SettingsRow, DangerButton,
} from "./SettingsPrimitives";

const TMDB_CACHE_KEY = "jellyflix_tmdb_trending";

// ─── StatusDot ────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium
      ${ok ? "text-green-400" : "text-red-400"}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
      {ok ? "Connected" : "Unreachable"}
    </span>
  );
}

// ─── JellyfinSettings ─────────────────────────────────────────────────────────

export function JellyfinSettings({
  authData,
  onLogout,
}: {
  authData: AuthData;
  onLogout: () => void;
}) {
  const [cacheCleared, setCacheCleared] = useState(false);

  const serverUrl = authData?.serverUrl ?? "—";
  const username  = authData?.username ?? authData?.userName ?? "—";

  function handleClearCache() {
    try {
      localStorage.removeItem(TMDB_CACHE_KEY);
      // Clear any other known cache keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("parallaxtv_") || key.startsWith("jellyflix_")) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  }

  return (
    <>
      <SettingsSection title="Connection">
        <SettingsRow label="Server" description={serverUrl}>
          <StatusDot ok={!!authData} />
        </SettingsRow>

        <SettingsRow label="Signed in as" description="Your Jellyfin account">
          <span className="text-xs text-gray-400 font-mono bg-white/5 px-2 py-1 rounded">
            {username}
          </span>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Cache">
        <SettingsRow
          label="Clear local cache"
          description="Removes cached trending data, thumbnails, and metadata"
        >
          <DangerButton
            label={cacheCleared ? "Cleared" : "Clear cache"}
            onClick={handleClearCache}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow
          label="Sign out"
          description="Returns to the login screen and clears your session"
          danger
        >
          <DangerButton label="Sign out" onClick={onLogout} />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}