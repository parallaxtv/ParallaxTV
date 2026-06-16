export function PlayButton({ onClick, large = false, children }: { onClick?: () => void; large?: boolean; children?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2.5 bg-white text-black font-bold rounded-full transition-all duration-200 hover:bg-gray-100 active:scale-95 shadow-lg ${large ? "py-3.5 px-10 text-lg" : "py-2.5 px-7 text-sm"}`}
    >
      <svg className={`${large ? "w-5 h-5" : "w-4 h-4"} fill-black`} viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
      {children || "Play"}
    </button>
  );
}

export function GhostButton({ onClick, children, large = false }: { onClick?: () => void; children: React.ReactNode; large?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold rounded-full border border-white/20 backdrop-blur-sm transition-all duration-200 ${large ? "py-3.5 px-10 text-lg" : "py-2.5 px-7 text-sm"}`}
    >
      {children}
    </button>
  );
}