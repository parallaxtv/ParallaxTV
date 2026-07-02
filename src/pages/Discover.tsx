import { useState } from "react";
import { useSettings } from "../store/settings";
import { Sidebar, Icons } from "../components/ui/Sidebar";
import { DiscoveryRow } from "../components/media/DiscoveryRow";
import { AuthData } from "../types/auth";

export function Discover({ authData, onLogout }: { authData: AuthData; onLogout: () => void }) {
  const { showMovies, showAnime, showKDrama } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nothingEnabled = !showMovies && !showAnime && !showKDrama;

  return (
    <div className="relative flex h-screen text-white overflow-hidden bg-[#0B0B0F]">
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 xl:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <Sidebar authData={authData} onLogout={onLogout} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <main className="flex-1 flex flex-col relative h-screen overflow-y-auto scrollbar-hide">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="xl:hidden absolute top-6 left-6 z-30 p-2 text-white/80 hover:text-white bg-black/40 rounded-lg backdrop-blur-md border border-white/10"
          aria-label="Open menu"
        >
          <Icons.Menu />
        </button>

        <div className="px-6 xl:px-10 pt-16 pb-2">
          <h1 className="text-2xl font-black text-white/90 tracking-wide drop-shadow-sm">Discover</h1>
          <p className="text-sm text-white/40 mt-1">What's trending worldwide, outside your library.</p>
        </div>

        <div className="px-6 xl:px-10 pb-24">
          {nothingEnabled ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <svg className="w-16 h-16 text-white/20 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-white/60 text-lg font-bold mb-2 tracking-wide">Discovery is turned off</p>
              <p className="text-white/40 text-sm font-medium">Enable Movies, Anime, or K-Drama discovery in Settings to see trending content here.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-8">
              {showMovies && <DiscoveryRow type="movies" title="Trending Movies Worldwide" authData={authData} />}
              {showAnime && (
                <>
                  <DiscoveryRow type="anime" title="Trending Anime Worldwide" authData={authData} />
                  <DiscoveryRow type="seasonal" title="This Season's Anime" authData={authData} />
                </>
              )}
              {showKDrama && <DiscoveryRow type="kdrama" title="Trending K-Dramas" authData={authData} />}
            </div>
          )}
        </div>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}