import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthData } from "../../types/auth";
import { ProfileMenu } from "./ProfileMenu";
import { createJellyfinApi } from "../../lib/jellyfinApi";
import { getUserViewsApi } from "@jellyfin/sdk/lib/utils/api/user-views-api";

import logo from "../../assets/parallaxtv_logo.svg";
import iconLogo from "../../assets/parallaxtv_icon.svg";

// ─── Design tokens ────────────────────────────────────────────────────────────
const OCEAN = "#38bdf8";
const SIDEBAR_EXPANDED_WIDTH = "w-[240px]";
const SIDEBAR_COLLAPSED_WIDTH = "w-[72px]";

// ─── Icons ────────────────────────────────────────────────────────────────────
export const Icons = {
  Home: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> ),
  Search: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> ),
  Discover: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> ),
  Movies: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> ),
  TV: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> ),
  History: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> ),
  Heart: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> ),
  Bell: () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> ),
  Menu: () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" /></svg> ),
  Folder: () => ( <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> ),
};

// ─── NavItem ──────────────────────────────────────────────────────────────────
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed: boolean;
}

function NavItem({ icon, label, active = false, onClick, collapsed }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        relative flex items-center rounded-lg
        transition-all duration-200 group
        ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full gap-3 px-3 py-2.5"}
        ${active ? "text-white" : "text-gray-500 hover:text-gray-200"}
      `}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ backgroundColor: OCEAN }} />
      )}
      <span
        className={`absolute inset-0 rounded-lg transition-opacity duration-200 ${ active ? "opacity-100" : "bg-white/[0.04] opacity-0 group-hover:opacity-100" }`}
        style={active ? { backgroundColor: "rgba(56,189,248,0.07)" } : undefined}
      />
      <span className="relative flex-shrink-0 transition-colors duration-200" style={active ? { color: OCEAN } : undefined}>
        {icon}
      </span>
      <span className={`
        relative text-[13px] font-medium whitespace-nowrap
        transition-all duration-300 overflow-hidden
        ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}
      `}>
        {label}
      </span>
    </button>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div className={`flex items-center mb-1 ${collapsed ? "justify-center" : "px-3"}`}>
      {collapsed
        ? <div className="w-4 h-px bg-white/10" />
        : <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">{label}</span>
      }
    </div>
  );
}

// ─── Sidebar Component ────────────────────────────────────────────────────────
interface SidebarProps {
  authData: AuthData;
  onLogout: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export function Sidebar({ authData, onLogout, mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isCollapsed = !isSidebarOpen;
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  
  // State to hold the user's custom Jellyfin libraries
  const [userLibraries, setUserLibraries] = useState<any[]>([]);

  // Fetch the custom user libraries when the sidebar mounts
  useEffect(() => {
    if (!authData) return;

    async function fetchLibraries() {
      try {
        const api = createJellyfinApi(authData.serverUrl, authData.token);
        const viewsApi = getUserViewsApi(api);
        
        const response = await viewsApi.getUserViews({ userId: authData.userId });
        setUserLibraries(response.data.Items ?? []);
      } catch (error) {
        console.error("Failed to fetch user libraries for sidebar:", error);
      }
    }

    fetchLibraries();
  }, [authData]);

  // Helper to determine what icon to show based on collection type
  const getLibraryIcon = (collectionType: string) => {
    switch (collectionType) {
      case "movies": return <Icons.Movies />;
      case "tvshows": return <Icons.TV />;
      default: return <Icons.Folder />;
    }
  };

  return (
    <aside 
      className={`
        relative fixed xl:relative z-[60] flex-shrink-0 flex flex-col h-full
        transition-all duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
        ${!isCollapsed ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH}
      `}
    >
      <button
        type="button"
        onClick={() => setIsSidebarOpen(open => !open)}
        className="hidden xl:flex absolute top-1/2 right-0 z-50 h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0D0D14] text-gray-300 shadow-xl transition-colors duration-200 hover:bg-white/10"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? "rotate-0" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        className="relative flex flex-col h-full my-3 ml-3 rounded-2xl shadow-2xl overflow-visible"
        style={{
          background: "rgba(13,13,20,0.75)",
          backdropFilter: "blur(28px) saturate(1.6)",
          WebkitBackdropFilter: "blur(28px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header: Logo */}
        <div className={`flex items-center pt-10 pb-4 ${isCollapsed ? "justify-center flex-col gap-4 px-3" : "justify-center px-5"}`}>
          <div className={`relative flex items-center justify-center transition-all duration-300 ${isCollapsed ? "w-10 h-10" : "w-32 h-7"}`}>
            <img
              src={isCollapsed ? iconLogo : logo}
              alt="Parallax TV"
              className={`drop-shadow-md transition-all duration-300 ${isCollapsed ? "w-8 h-8 object-contain" : "h-6 w-auto object-center object-contain"}`}
            />
          </div>
          
          <button 
            className="xl:hidden ml-auto p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto scrollbar-hide py-2 space-y-6 ${isCollapsed ? "px-1" : "px-3"}`}>
          
          {/* Top Menu Section */}
          <div className="space-y-0.5">
            <SectionLabel label="Menu" collapsed={isCollapsed} />
            
            <NavItem 
              collapsed={isCollapsed} 
              icon={<Icons.Home />}     
              label="Home"
              active={location.pathname === "/dashboard"}
              onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }}
            />
            
            <NavItem
              collapsed={isCollapsed}
              icon={<Icons.Discover />}
              label="Discover"
              active={location.pathname === "/discover"}
              onClick={() => { navigate("/discover"); setMobileMenuOpen(false); }}
            />

            <NavItem
              collapsed={isCollapsed}
              icon={<Icons.History />}
              label="Recently Added"
              active={location.pathname === "/recently-added"}
              onClick={() => { navigate("/recently-added"); setMobileMenuOpen(false); }}
            />
            <NavItem
              collapsed={isCollapsed}
              icon={<Icons.Heart />}
              label="Favorites"
              active={location.pathname === "/favorites"}
              onClick={() => { navigate("/favorites"); setMobileMenuOpen(false); }}
            />
          </div>

          {/* Dynamic Library Section */}
          <div className="space-y-0.5">
            <button 
              onClick={() => !isCollapsed && setIsLibraryExpanded(!isLibraryExpanded)}
              className={`w-full flex items-center mb-1 group transition-all ${isCollapsed ? 'justify-center cursor-default' : 'justify-between px-3'}`}
            >
              <SectionLabel label="Library" collapsed={isCollapsed} />
              {!isCollapsed && (
                <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isLibraryExpanded ? "" : "-rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            
            {(isLibraryExpanded || isCollapsed) && (
              <div className="space-y-0.5 animate-in fade-in duration-300">
                {userLibraries.map((lib) => (
                  <NavItem 
                    key={lib.Id}
                    collapsed={isCollapsed} 
                    icon={getLibraryIcon(lib.CollectionType)} 
                    label={lib.Name}
                    active={location.pathname === `/library/${lib.Id}`}
                    onClick={() => {
                      navigate(`/library/${lib.Id}`, { state: { library: lib } });
                      setMobileMenuOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

        </nav>

        {/* Profile Area */}
        <div className={`flex-shrink-0 border-t border-white/[0.06] pt-3 pb-4 ${isCollapsed ? "px-1" : "px-3"}`}>
          <button
            className="xl:hidden flex items-center gap-2.5 rounded-lg w-full py-2 px-3 mb-2 text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all text-[13px]"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Close menu</span>
          </button>

          <div className="relative z-[70]">
            <ProfileMenu authData={authData} onLogout={onLogout} collapsed={isCollapsed} />
          </div>
        </div>
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </aside>
  );
}