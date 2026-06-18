import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { init } from "tauri-plugin-libmpv-api";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Details } from "./pages/Details";
import { VideoPlayer } from "./pages/VideoPlayer";
import { Library } from "./pages/Library";
import { PersonPage } from "./pages/PersonPage";
import { Settings } from "./pages/Settings";
import { useAuthStore } from "./store/auth";
import { useSettings } from "./store/settings";
import "./App.css";

const fadeInStyle = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

// ── MPV SINGLETON ─────────────────────────────────────────────────────────────

let _mpvReady = false;
const _mpvReadyCallbacks: (() => void)[] = [];

export function onMpvReady(cb: () => void) {
  if (_mpvReady) { cb(); return; }
  _mpvReadyCallbacks.push(cb);
}

init({
  initialOptions: {
    vo: "gpu-next",
    hwdec: "auto-safe",
    "keep-open": "yes",
    "force-window": "yes",
    "input-default-bindings": "no",
    "input-vo-keyboard": "no",
  },
  observedProperties: [
    ["pause", "flag"],
    ["time-pos", "double", "none"],
    ["duration", "double", "none"],
  ],
})
  .then(() => {
    console.log("[MPV] Ready");
    _mpvReady = true;
    _mpvReadyCallbacks.forEach((cb) => cb());
    _mpvReadyCallbacks.length = 0;
  })
  .catch((e) => console.error("[MPV] Init failed", e));

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