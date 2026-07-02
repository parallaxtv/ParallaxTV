import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { destroy, init, type MpvObservableProperty } from "tauri-plugin-libmpv-api";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Details } from "./pages/Details";
import { EpisodeDetails } from "./pages/EpisodeDetails"; // <-- Added Import
import { VideoPlayer } from "./pages/VideoPlayer";
import { Library } from "./pages/Library";
import { Discover } from "./pages/Discover";
import { RecentlyAdded } from "./pages/RecentlyAdded";
import { Favorites } from "./pages/Favorites";
import { PersonPage } from "./pages/PersonPage";
import { Settings } from "./pages/Settings";
import { useAuthStore } from "./store/auth";
import { useSettings } from "./store/settings";
import { TitleBar } from "./components/ui/TitleBar";
import { stopMpvEventListener } from "./lib/mpvEvents";
import "./App.css";

const fadeInStyle = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const MPV_OBSERVED_PROPERTIES = [
  ["pause", "flag"],
  ["time-pos", "double", "none"],
  ["duration", "double", "none"],
  ["fullscreen", "flag"],
  ["estimated-vf-fps", "double", "none"],
  ["vo-drop-frame-count", "int64", "none"],
  ["video-format", "string", "none"],
  ["audio-codec-name", "string", "none"],
  ["width", "int64", "none"],
  ["height", "int64", "none"],
  ["hwdec-current", "string", "none"],
] as const satisfies MpvObservableProperty[];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

function AppTitleBar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/play/")) return null;
  return <TitleBar />;
}

// ── MPV SINGLETON ─────────────────────────────────────────────────────────────

type MpvState = {
  initialized: boolean;
  ready: boolean;
  starting: Promise<void> | null;
  callbacks: Set<() => void>;
};

const _w = window as Window & { __parallax_mpv?: MpvState };
const _mpv = (_w.__parallax_mpv ??= {
  initialized: false,
  ready: false,
  starting: null,
  callbacks: new Set(),
});

export function onMpvReady(cb: () => void) {
  if (_mpv.ready) {
    cb();
    return () => {};
  }

  _mpv.callbacks.add(cb);
  return () => {
    _mpv.callbacks.delete(cb);
  };
}

export function ensureMpvReady() {
  if (_mpv.ready) return Promise.resolve();
  if (_mpv.starting) return _mpv.starting;

  _mpv.initialized = true;
  _mpv.starting = init({
    initialOptions: {
      vo: "gpu-next",
      hwdec: "auto-safe",
      "keep-open": "yes",
      "force-window": "yes",
      "input-default-bindings": "no",
      "input-vo-keyboard": "no",
    },
    observedProperties: MPV_OBSERVED_PROPERTIES,
  })
    .then(() => {
      console.log("[MPV] Ready");
      _mpv.ready = true;
      _mpv.callbacks.forEach((cb) => cb());
      _mpv.callbacks.clear();
    })
    .catch((e) => {
      _mpv.initialized = false;
      console.error("[MPV] Init failed", e);
      throw e;
    })
    .finally(() => {
      _mpv.starting = null;
    });

  return _mpv.starting;
}

const cleanupMpvForReload = () => {
  _mpv.callbacks.clear();
  _mpv.ready = false;
  _mpv.initialized = false;
  stopMpvEventListener()
    .catch(() => {})
    .finally(() => {
      destroy().catch(() => {});
    });
};

if (import.meta.hot) {
  import.meta.hot.dispose(cleanupMpvForReload);
}

window.addEventListener("beforeunload", cleanupMpvForReload, { once: true });

// ── AUTH GUARD ────────────────────────────────────────────────────────────────

function Protected({ children }: { children: React.ReactNode }) {
  const { authData } = useAuthStore();
  return authData ? <>{children}</> : <Navigate to="/" replace />;
}

// ── THEME ROOT ────────────────────────────────────────────────────────────────
// Applies theme background and accent colors to <html> root variables.
// This allows Tailwind to dynamically use var(--color-accent) globally.

function ThemeRoot() {
  // Grab both theme and accentTheme from our Zustand store
  const { theme, accentTheme } = useSettings();

  useEffect(() => {
    const root = document.documentElement;

    // 1. Background Theme Injection
    const bgColors: Record<string, string> = {
      dark:     "#141414",
      amoled:   "#000000",
      midnight: "#0a0a0f", // Deep blue-tinted black
    };
    
    const bgPrimary = bgColors[theme] ?? bgColors.dark;
    root.style.backgroundColor = bgPrimary; // Fallback for standard CSS
    root.style.setProperty('--color-bg-primary', bgPrimary);

    // 2. Accent Theme Injection
    const accentColors: Record<string, string> = {
      aurora:  "#8b5cf6", // Purple
      ocean:   "#38bdf8", // Blue
      emerald: "#10b981", // Green
      sunset:  "#f59e0b", // Amber
      crimson: "#ef4444", // Red
    };

    // Check if the user selected a custom hex color, otherwise use the preset dictionary
    const accent = accentTheme.startsWith("#") ? accentTheme : (accentColors[accentTheme] ?? accentColors.aurora);

    // Inject the raw hex for solid colors
    root.style.setProperty('--color-accent', accent);
    
    // Inject a 25% opacity version (hex + '40') for glowing box-shadows
    root.style.setProperty('--color-accent-glow', `${accent}40`);
    
    // Inject a 10% opacity version (hex + '1a') for subtle active backgrounds
    root.style.setProperty('--color-accent-soft', `${accent}1a`);

  }, [theme, accentTheme]);

  return null;
}

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { authData, logout } = useAuthStore();

  return (
    <>
      <style>{fadeInStyle}</style>
      <BrowserRouter>
        <AppTitleBar />
        <ThemeRoot />
        <ScrollToTop />
        <Routes>
          <Route
            path="/"
            element={authData ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard authData={authData!} onLogout={logout} />
              </Protected>
            }
          />

          <Route
            path="/settings"
            element={
              <Protected>
                <Settings authData={authData!} onLogout={logout} />
              </Protected>
            }
          />

          <Route
            path="/title/:id"
            element={
              <Protected>
                <Details authData={authData!} onLogout={logout} />
              </Protected>
            }
          />

          {/* ── Added Episode Details Route ── */}
          <Route
            path="/episode/:id"
            element={
              <Protected>
                <EpisodeDetails authData={authData!} />
              </Protected>
            }
          />

          <Route
            path="/person/:id"
            element={
              <Protected>
                <PersonPage authData={authData!} />
              </Protected>
            }
          />

          <Route
            path="/play/:id"
            element={
              <Protected>
                <VideoPlayer authData={authData!} />
              </Protected>
            }
          />

          <Route
            path="/library/:id"
            element={
              <Protected>
                <Library authData={authData!} onLogout={logout} />
              </Protected>
            }
          />

          <Route
            path="/discover"
            element={
              <Protected>
                <Discover authData={authData!} onLogout={logout} />
              </Protected>
            }
          />

          <Route
            path="/recently-added"
            element={
              <Protected>
                <RecentlyAdded authData={authData!} onLogout={logout} />
              </Protected>
            }
          />

          <Route
            path="/favorites"
            element={
              <Protected>
                <Favorites authData={authData!} onLogout={logout} />
              </Protected>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}