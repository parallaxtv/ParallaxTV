import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";

interface SurpriseMeProps {
  authData: any;
}

export function SurpriseMe({ authData }: SurpriseMeProps) {
  const navigate  = useNavigate();
  const [state, setState] = useState<"idle" | "spinning" | "pop">("idle");

  const handleSurprise = useCallback(async () => {
    if (state !== "idle" || !authData) return;
    setState("spinning");

    try {
      const itemsApi = getItemsApi(authData.api);
      const res = await itemsApi.getItems({
        userId: authData.userId,
        includeItemTypes: ["Movie", "Series"],
        recursive: true,
        filters: ["IsUnplayed" as any],
        fields: ["Overview", "CommunityRating", "ImageTags",
                 "BackdropImageTags", "ProductionYear", "Genres"] as any,
        limit: 200,
        sortBy: ["Random"] as any,
      });

      const items = res.data.Items ?? [];
      if (items.length === 0) { setState("idle"); return; }

      const pick = items[Math.floor(Math.random() * items.length)];

      // Pop animation then navigate
      setState("pop");
      setTimeout(() => {
        setState("idle");
        navigate(`/title/${pick.Id}`, { state: { item: pick } });
      }, 600);
    } catch (err) {
      console.error("Surprise Me failed", err);
      setState("idle");
    }
  }, [authData, navigate, state]);

  return (
    <button
      onClick={handleSurprise}
      disabled={state !== "idle"}
      title="Surprise Me — pick something random to watch"
      className={`relative w-10 h-10 flex items-center justify-center rounded-full
        bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/25
        text-gray-400 hover:text-white backdrop-blur-sm
        transition-all duration-200
        ${state === "spinning" ? "cursor-wait" : "hover:scale-110 active:scale-95"}`}
      style={{
        animation: state === "pop" ? "giftPop 0.6s cubic-bezier(0.36,0.07,0.19,0.97) both" : undefined,
      }}
    >
      {/* Gift box SVG */}
      <svg
        className={`w-5 h-5 transition-transform duration-300
          ${state === "spinning" ? "animate-bounce" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Box body */}
        <rect x="3" y="10" width="18" height="11" rx="1" />
        {/* Lid */}
        <rect x="2" y="6" width="20" height="4" rx="1" />
        {/* Ribbon vertical */}
        <line x1="12" y1="6" x2="12" y2="21" />
        {/* Ribbon bow left */}
        <path d="M12 6 C10 4 7 4 7 6 C7 8 10 8 12 6" />
        {/* Ribbon bow right */}
        <path d="M12 6 C14 4 17 4 17 6 C17 8 14 8 12 6" />
      </svg>

      {/* Sparkle particles on pop */}
      {state === "pop" && (
        <>
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-400 pointer-events-none"
              style={{
                animation: `sparkle${i} 0.6s ease-out forwards`,
                top: "50%", left: "50%",
              }}
            />
          ))}
        </>
      )}

      <style>{`
        @keyframes giftPop {
          0%   { transform: scale(1) rotate(0deg); }
          20%  { transform: scale(1.4) rotate(-8deg); }
          40%  { transform: scale(1.6) rotate(8deg); }
          60%  { transform: scale(1.3) rotate(-4deg); }
          80%  { transform: scale(1.1) rotate(2deg); }
          100% { transform: scale(1)   rotate(0deg); }
        }
        @keyframes sparkle0 { to { transform: translate(-18px, -18px) scale(0); opacity: 0; } }
        @keyframes sparkle1 { to { transform: translate(18px,  -18px) scale(0); opacity: 0; } }
        @keyframes sparkle2 { to { transform: translate(-22px,  0px)  scale(0); opacity: 0; } }
        @keyframes sparkle3 { to { transform: translate(22px,   0px)  scale(0); opacity: 0; } }
        @keyframes sparkle4 { to { transform: translate(-14px,  18px) scale(0); opacity: 0; } }
        @keyframes sparkle5 { to { transform: translate(14px,   18px) scale(0); opacity: 0; } }
      `}</style>
    </button>
  );
}