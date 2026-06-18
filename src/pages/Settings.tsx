import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthData } from "../types/auth";
import { AppearanceSettings } from "../components/settings/AppearanceSettings";
import { PlaybackSettings } from "../components/settings/PlaybackSettings";
import { DiscoverySettings } from "../components/settings/DiscoverySettings";
import { JellyfinSettings } from "../components/settings/JellyfinSettings";
import { KeyboardSettings } from "../components/settings/KeyboardSettings";
import { AboutSettings } from "../components/settings/AboutSettings";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPalette()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5S18.33 11 17.5 11z"/></svg>; }
function IconPlay()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><polygon strokeLinecap="round" strokeLinejoin="round" points="5 3 19 12 5 21 5 3"/></svg>; }
function IconCompass()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon strokeLinecap="round" strokeLinejoin="round" points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>; }
function IconServer()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6" strokeWidth={3} strokeLinecap="round"/><line x1="6" y1="18" x2="6.01" y2="18" strokeWidth={3} strokeLinecap="round"/></svg>; }
function IconKeyboard()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path strokeLinecap="round" d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>; }
function IconInfo()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" strokeWidth={2.5}/></svg>; }
function IconChevronLeft() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>; }

// ─── Nav definition ───────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "appearance", label: "Appearance",        Icon: IconPalette  },
  { id: "playback",   label: "Playback",           Icon: IconPlay     },
  { id: "discovery",  label: "Discovery",          Icon: IconCompass  },
  { id: "jellyfin",   label: "Jellyfin",           Icon: IconServer   },
  { id: "keyboard",   label: "Keyboard Shortcuts", Icon: IconKeyboard },
  { id: "about",      label: "About",              Icon: IconInfo     },
] as const;

type NavId = typeof NAV_ITEMS[number]["id"];

// ─── Settings ─────────────────────────────────────────────────────────────────

export function Settings({ authData, onLogout }: { authData: AuthData; onLogout: () => void }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<NavId>("appearance");

  function renderSection() {
    switch (activeSection) {
      case "appearance": return <AppearanceSettings />;
      case "playback":   return <PlaybackSettings />;
      case "discovery":  return <DiscoverySettings />;
      case "jellyfin":   return <JellyfinSettings authData={authData} onLogout={onLogout} />;
      case "keyboard":   return <KeyboardSettings />;
      case "about":      return <AboutSettings />;
    }
  }

  const activeLabel = NAV_ITEMS.find(n => n.id === activeSection)?.label ?? "";

  return (
    <div className="min-h-screen bg-[#141414] text-white flex animate-[fadeIn_0.2s_ease-out]">

      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 border-r border-white/6 flex flex-col">

        {/* Back to dashboard */}
        <div className="px-5 pt-6 pb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">
              <IconChevronLeft />
            </span>
            Back
          </button>
        </div>

        <div className="px-5 pb-5">
          <h1 className="text-[11px] font-semibold tracking-widest text-gray-600 uppercase">Settings</h1>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 text-sm
                  ${active
                    ? "bg-white/8 text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/4"
                  }`}
              >
                <span className={active ? "text-white" : "text-gray-600"}>
                  <Icon />
                </span>
                <span className="font-medium">{label}</span>
                {active && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Version stamp */}
        <div className="px-5 py-5 border-t border-white/5">
          <p className="text-[11px] text-gray-700">ParallaxTV</p>
          <p className="text-[10px] text-gray-800 mt-0.5">v0.5.0</p>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-10">
          <h2 className="text-2xl font-black text-white mb-8">{activeLabel}</h2>
          <div key={activeSection} className="animate-[fadeIn_0.15s_ease-out]">
            {renderSection()}
          </div>
        </div>
      </main>
    </div>
  );
}