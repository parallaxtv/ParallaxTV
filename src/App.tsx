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
import { VideoPlayer } from "./pages/VideoPlayer";
import { Library } from "./pages/Library";
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
// Applies theme background to <html> so there's no flash of wrong color
// on page transitions between routes.

function ThemeRoot() {
  const { theme } = useSettings();

  useEffect(() => {
    const colors: Record<string, string> = {
      dark:     "#141414",
      amoled:   "#000000",
      midnight: "#0d1117",
    };
    document.documentElement.style.backgroundColor = colors[theme] ?? colors.dark;
  }, [theme]);

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
                <Details authData={authData!} />
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
                <Library authData={authData!} />
              </Protected>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}
