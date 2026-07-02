import { useNavigate } from "react-router-dom";
import { AuthData } from "../../types/auth";
import { AppNotification, useNotificationsStore } from "../../store/notifications";

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface NotificationPanelProps {
  authData: AuthData;
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const notifications = useNotificationsStore((s) => s.notifications);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const hasUnread = notifications.some((n) => !n.read);

  if (!open) return null;

  const handleSelect = (n: AppNotification) => {
    markRead(n.id);
    if (n.itemId) navigate(`/title/${n.itemId}`);
    onClose();
  };

  return (
    <>
      {/* Click-away layer */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="absolute right-0 top-full mt-3 w-[360px] max-h-[480px] flex flex-col z-50 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(17,17,22,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {hasUnread && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-medium text-gray-400 hover:text-[var(--color-accent)] transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-400">You're all caught up</p>
              <p className="text-xs text-gray-600 mt-1">New additions to your library will show up here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleSelect(n)}
                className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.04] ${
                  n.read ? "" : "bg-white/[0.02]"
                }`}
              >
                {n.imageUrl ? (
                  <img
                    src={n.imageUrl}
                    alt=""
                    className="w-10 h-14 rounded-md object-cover flex-shrink-0 bg-white/5"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div className="w-10 h-14 rounded-md flex-shrink-0 bg-white/5" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{n.title}</p>
                  {n.subtitle && (
                    <p className="text-[12px] text-gray-500 truncate">{n.subtitle}</p>
                  )}
                  <p className="text-[11px] text-gray-600 mt-0.5">{relativeTime(n.createdAt)}</p>
                </div>

                {!n.read && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  />
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                  aria-label="Dismiss"
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}