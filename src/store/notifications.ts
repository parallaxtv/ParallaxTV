import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

// Extensible on purpose — "system" covers things like app-update alerts later.
export type NotificationType = "new_media" | "system";

export interface AppNotification {
  id: string;              // stable id — for new_media this is the Jellyfin item id
  type: NotificationType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  itemId?: string;         // navigable Jellyfin item id, if applicable
  createdAt: number;       // epoch ms
  read: boolean;
}

const MAX_NOTIFICATIONS = 50;   // keep the persisted list from growing forever
const MAX_SEEN_IDS = 500;       // rolling window of ids we've already accounted for

export interface NotificationsState {
  notifications: AppNotification[];
  seenItemIds: string[];
  hasHydratedBaseline: boolean; // false until the first-ever library scan has run

  addNotifications:    (items: AppNotification[]) => void;
  markSeen:            (ids: string[]) => void;
  setBaselineHydrated: () => void;
  markRead:            (id: string) => void;
  markAllRead:         () => void;
  dismiss:             (id: string) => void;
  clearAll:            () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications:        [],
      seenItemIds:          [],
      hasHydratedBaseline:  false,

      addNotifications: (items) => {
        if (items.length === 0) return;
        const existingIds = new Set(get().notifications.map((n) => n.id));
        const fresh = items.filter((n) => !existingIds.has(n.id));
        if (fresh.length === 0) return;

        set({
          notifications: [...fresh, ...get().notifications].slice(0, MAX_NOTIFICATIONS),
        });
      },

      markSeen: (ids) => {
        if (ids.length === 0) return;
        const merged = new Set([...get().seenItemIds, ...ids]);
        set({ seenItemIds: Array.from(merged).slice(-MAX_SEEN_IDS) });
      },

      setBaselineHydrated: () => set({ hasHydratedBaseline: true }),

      markRead: (id) =>
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }),

      markAllRead: () =>
        set({
          notifications: get().notifications.map((n) => ({ ...n, read: true })),
        }),

      dismiss: (id) =>
        set({
          notifications: get().notifications.filter((n) => n.id !== id),
        }),

      clearAll: () => set({ notifications: [] }),
    }),
    { name: "parallaxtv-notifications" }
  )
);

// Small selector hook so components re-render only on count changes, not on
// every notification list mutation.
export const useUnreadCount = () =>
  useNotificationsStore((s) => s.notifications.filter((n) => !n.read).length);