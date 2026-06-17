export function ScoreBadge({ score }: { score?: number }) {
  if (!score) return null;
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-gray-400";
  return (
    <span className={`text-[11px] font-bold tabular-nums ${color}`}>
      {score}<span className="text-[9px] text-gray-500 font-normal">%</span>
    </span>
  );
}