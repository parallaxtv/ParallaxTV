import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../store/settings";
import { AuthData } from "../../types/auth";

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconSettings() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>; }
function IconLogout()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }
function IconCrown()    { return <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>; }

interface ProfileMenuProps {
  authData: AuthData;
  onLogout: () => void;
  collapsed?: boolean;
}

function Avatar({ serverUrl, token, userId, initials }: { serverUrl: string; token: string; userId: string; initials: string; }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = `${serverUrl.replace(/\/$/, "")}/Users/${userId}/Images/Primary?quality=90&api_key=${token}`;
  
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm bg-gradient-to-br from-[#38bdf8] to-purple-600 text-white flex-shrink-0 overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-white/20 transition-all">
      {!failed ? (
        <img src={avatarUrl} alt={initials} className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials
      )}
    </div>
  );
}

export function ProfileMenu({ authData, onLogout, collapsed = false }: ProfileMenuProps) {
  const navigate = useNavigate();
  const { backdropBlur } = useSettings();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const username = authData?.username ?? "User";
  const initials = username.slice(0, 2).toUpperCase();
  const serverUrl = authData?.serverUrl ?? "";
  const token     = authData?.token ?? "";
  const userId    = authData?.userId ?? "";

  return (
    <div ref={menuRef} className="relative w-full flex justify-center">
      
      {/* ── Overhauled Profile Trigger ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center ${collapsed ? 'justify-center p-0' : 'gap-3 p-2'} rounded-xl hover:bg-white/5 transition-colors focus:outline-none group`}
        title={collapsed ? "Open Profile Menu" : undefined}
      >
        <Avatar serverUrl={serverUrl} token={token} userId={userId} initials={initials} />
        
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-white truncate">{username}</p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#38bdf8]">
                <IconCrown /> Premium
              </div>
            </div>
            <div className="text-gray-500 group-hover:text-white transition-colors mr-1">
              <IconSettings />
            </div>
          </>
        )}
      </button>

      {/* ── Dropdown Menu ── */}
      {open && (
        <div
          className="absolute left-0 bottom-[calc(100%+12px)] w-56 rounded-2xl overflow-hidden shadow-2xl z-[100] border border-white/10"
          style={{
            background: "linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(28,28,28,0.98) 100%)",
            backdropFilter: backdropBlur ? "blur(20px)" : "none",
            animation: "dropdownIn 0.18s ease-out both",
          }}
        >
          <div className="py-2">
            <button
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-white/5 transition-colors group"
              onClick={() => { setOpen(false); navigate("/settings"); }}
            >
              <span className="text-gray-500 group-hover:text-white transition-colors"><IconSettings /></span>
              <p className="text-sm text-gray-300 group-hover:text-white font-medium">Settings</p>
            </button>
            <div className="mx-3 my-1 h-px bg-white/5" />
            <button
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-red-500/10 transition-colors group"
              onClick={() => { setOpen(false); onLogout(); }}
            >
              <span className="text-gray-500 group-hover:text-red-400 transition-colors"><IconLogout /></span>
              <p className="text-sm text-gray-300 group-hover:text-red-400 font-medium">Sign Out</p>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}