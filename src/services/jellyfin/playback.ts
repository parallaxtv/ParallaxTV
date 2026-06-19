import { AuthData } from "../../types/auth";

/**
 * Handles all Jellyfin playback reporting (Progress, Start, Stop)
 */
export async function reportPlaybackProgress(
  authData: AuthData,
  itemId: string,
  ticks: number,
  isPaused: boolean,
  isMuted: boolean
) {
  const payload = { 
    ItemId: itemId, 
    PositionTicks: ticks, 
    IsPaused: isPaused, 
    IsMuted: isMuted, 
    PlayMethod: "DirectStream" 
  };

  // We perform these in parallel so the UI doesn't stutter
  return Promise.all([
    fetch(`${authData.serverUrl}/Sessions/Playing/Progress?api_key=${authData.token}`, {
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(payload),
    }),
    fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayingItems/${itemId}/Progress?PositionTicks=${ticks}&api_key=${authData.token}`, {
      method: "POST",
    }),
  ]);
}

export async function reportPlaybackStopped(
  authData: AuthData,
  itemId: string,
  ticks: number
) {
  const payload = { 
    ItemId: itemId, 
    PositionTicks: ticks, 
    IsPaused: true, 
    PlayMethod: "DirectStream" 
  };

  return fetch(`${authData.serverUrl}/Sessions/Playing/Stopped?api_key=${authData.token}`, {
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(payload),
  });
}
