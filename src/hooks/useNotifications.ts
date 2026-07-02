import { useEffect, useRef } from "react";
import { AuthData } from "../types/auth";
import { getLatestMedia } from "../services/jellyfin/items";
import { useNotificationsStore, AppNotification } from "../store/notifications";

const POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes
const SCAN_LIMIT = 50;

function buildImageUrl(authData: AuthData, itemId: string) {
  return `${authData.serverUrl}/Items/${itemId}/Images/Primary?fillWidth=100&quality=90&api_key=${authData.token}`;
}

// Runs a poll cycle: fetch latest media, diff against what we've already
// accounted for, and either seed the baseline (first run) or emit
// notifications for anything genuinely new.
async function runScan(authData: AuthData) {
  const { hasHydratedBaseline, seenItemIds, addNotifications, markSeen, setBaselineHydrated } =
    useNotificationsStore.getState();

  const items = await getLatestMedia(authData, ["Movie", "Series"], SCAN_LIMIT);
  const fetchedIds = items.map((i) => i.Id).filter(Boolean) as string[];

  if (!hasHydratedBaseline) {
    // First time this install has ever scanned — record what already exists
    // without notifying, so the user isn't flooded with their whole library.
    markSeen(fetchedIds);
    setBaselineHydrated();
    return;
  }

  const seen = new Set(seenItemIds);
  const newItems = items.filter((i) => i.Id && !seen.has(i.Id));
  if (newItems.length === 0) return;

  const notifications: AppNotification[] = newItems.map((item) => ({
    id: item.Id as string,
    type: "new_media",
    title: item.Name ?? "Untitled",
    subtitle: item.Type === "Series" ? "New show added" : "New movie added",
    imageUrl: item.Id ? buildImageUrl(authData, item.Id) : undefined,
    itemId: item.Id as string,
    createdAt: Date.now(),
    read: false,
  }));

  addNotifications(notifications);
  markSeen(fetchedIds);
}

// Mount this once near the top of the app (e.g. in Dashboard) — it has no
// visual output, it just keeps the notifications store fed in the background.
export function useNotifications(authData: AuthData | null) {
  const inFlight = useRef(false);

  useEffect(() => {
    if (!authData) return;

    const tick = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await runScan(authData);
      } catch (err) {
        console.error("Notification scan failed:", err);
      } finally {
        inFlight.current = false;
      }
    };

    tick(); // run immediately on mount / login
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authData]);
}