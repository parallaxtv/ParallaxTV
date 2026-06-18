import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../store/settings";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconRefresh()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>; }
function IconSettings() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>; }
function IconLogout()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }
function IconCheck()    { return <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>; }
function IconSpinner()  { return <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>; }

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanState = "idle" | "scanning" | "done" | "error";

const TMDB_KEY       = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const TMDB_CACHE_KEY = "jellyflix_tmdb_trending";

interface ProfileMenuProps {
  authData: any;
  onLogout: () => void;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  serverUrl, token, userId, initials, size = "md", open = false,
}: {
  serverUrl: string; token: string; userId: string;
  initials: string; size?: "md" | "lg"; open?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = `${serverUrl}/Users/${userId}/Images/Primary?quality=90&api_key=${token}`;
  const dim = size === "lg" ? "w-10 h-10" : "w-10 h-10";
  const base = `${dim} rounded-full flex items-center justify-center font-black text-sm
    bg-gradient-to-br from-red-600 to-red-800 text-white flex-shrink-0 overflow-hidden`;
  const border = open
    ? "border-2 border-white scale-105"
    : "border-2 border-white/20 hover:border-white/50 hover:scale-105";

  if (!failed) {
    return (
      <div className={`${base} ${size === "md" ? border : ""} shadow-lg transition-all duration-200`}>
        <img
          src={avatarUrl}
          alt={initials}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${base} ${size === "md" ? border : ""} shadow-lg transition-all duration-200`}>
      {initials}
    </div>
  );
}

// ─── ProfileMenu ──────────────────────────────────────────────────────────────

export function ProfileMenu({ authData, onLogout }: ProfileMenuProps) {
  const navigate = useNavigate();
  const { backdropBlur } = useSettings();

  const [open, setOpen]           = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanMsg, setScanMsg]     = useState("");
  const [lastScan, setLastScan]   = useState<string | null>(() => {
    try {
      const c = localStorage.getItem(TMDB_CACHE_KEY);
      if (c) {
        const { timestamp } = JSON.parse(c);
        return new Date(timestamp).toLocaleString();
      }
    } catch {}
    return null;
  });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleForceScan() {
    if (scanState === "scanning") return;
    if (!TMDB_KEY) {
      setScanState("error");
      setScanMsg("No TMDB API key set in .env");
      setTimeout(() => setScanState("idle"), 3000);
      return;
    }

    setScanState("scanning");
    setScanMsg("Fetching latest trending data…");

    try {
      localStorage.removeItem(TMDB_CACHE_KEY);

      const [mr, tr] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`),
        fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}`),
      ]);

      if (!mr.ok || !tr.ok) throw new Error("TMDB request failed");

      const movies = (await mr.json()).results ?? [];
      const tv     = (await tr.json()).results ?? [];

      const normTitle = (t: string) =>
        t.toLowerCase().replace(/^(the |a |an )/i,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();

      const entries = [
        ...movies.map((m: any, i: number) => ({ title: normTitle(m.title ?? ""), year: m.release_date ? +m.release_date.slice(0,4) : null, rank: i + 1 })),
        ...tv.map((t: any, i: number)     => ({ title: normTitle(t.name  ?? ""), year: t.first_air_date ? +t.first_air_date.slice(0,4) : null, rank: i + 1 })),
      ];

      localStorage.setItem(TMDB_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: entries }));

      const now = new Date().toLocaleString();
      setLastScan(now);
      setScanState("done");
      setScanMsg(`Updated ${movies.length + tv.length} titles`);
      setTimeout(() => { setScanState("idle"); setScanMsg(""); }, 4000);
    } catch {
      setScanState("error");
      setScanMsg("Scan failed — check your API key");
      setTimeout(() => { setScanState("idle"); setScanMsg(""); }, 4000);
    }
  }

  const username: string = authData?.username ?? authData?.userName ?? "U";
  const initials = username.slice(0, 2).toUpperCase();
  const serverUrl = authData?.serverUrl ?? "";
  const token     = authData?.token ?? "";
  const userId    = authData?.userId ?? "";

  return (
    <div ref={menuRef} className="relative pointer-events-auto">

      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Profile menu"
        className="focus:outline-none"
      >
        <Avatar serverUrl={serverUrl} token={token} userId={userId}
          initials={initials} size="md" open={open} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-2xl overflow-hidden shadow-2xl z-50"
          style={{
            background: "linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(28,28,28,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: backdropBlur ? "blur(20px)" : "none",
            animation: "dropdownIn 0.18s ease-out both",
          }}
        >
          {/* Profile header */}
          <div className="px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Avatar serverUrl={serverUrl} token={token} userId={userId}
                initials={initials} size="lg" />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{username}</p>
                <p className="text-gray-500 text-xs truncate">{serverUrl}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">

            {TMDB_KEY && (
              <div className="px-3 py-1.5">
                <button
                  onClick={handleForceScan}
                  disabled={scanState === "scanning"}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                    ${scanState === "scanning"
                      ? "bg-white/5 cursor-wait"
                      : scanState === "done"
                        ? "bg-green-500/10"
                        : scanState === "error"
                          ? "bg-red-500/10"
                          : "hover:bg-white/8 active:bg-white/12"
                    }`}
                >
                  <span className={`flex-shrink-0 ${
                    scanState === "done"  ? "text-green-400" :
                    scanState === "error" ? "text-red-400"   : "text-gray-400"
                  }`}>
                    {scanState === "scanning" ? <IconSpinner /> :
                     scanState === "done"     ? <IconCheck />   : <IconRefresh />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${
                      scanState === "done"  ? "text-green-400" :
                      scanState === "error" ? "text-red-400"   : "text-white"
                    }`}>
                      {scanState === "scanning" ? "Scanning…"      :
                       scanState === "done"     ? "Scan complete!" :
                       scanState === "error"    ? "Scan failed"    :
                       "Refresh Trending Data"}
                    </p>
                    <p className="text-[11px] text-gray-600 truncate mt-0.5">
                      {scanMsg || (lastScan ? `Last scan: ${lastScan}` : "Force fetch latest from TMDB")}
                    </p>
                  </div>
                </button>
              </div>
            )}

            <div className="mx-3 my-1 h-px bg-white/5" />

            <button
              className="w-full flex items-center gap-3 px-6 py-2.5 text-left hover:bg-white/5 transition-colors group"
              onClick={() => { setOpen(false); navigate("/settings"); }}
            >
              <span className="text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0">
                <IconSettings />
              </span>
              <p className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
                Settings
              </p>
            </button>

            <div className="mx-3 my-1 h-px bg-white/5" />

            <button
              className="w-full flex items-center gap-3 px-6 py-2.5 text-left hover:bg-red-500/10 transition-colors group"
              onClick={() => { setOpen(false); onLogout(); }}
            >
              <span className="text-gray-500 group-hover:text-red-400 transition-colors flex-shrink-0">
                <IconLogout />
              </span>
              <p className="text-sm text-gray-300 group-hover:text-red-400 transition-colors font-medium">
                Sign Out
              </p>
            </button>

          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}