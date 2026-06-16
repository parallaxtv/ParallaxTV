export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || isNaN(seconds)) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function formatRuntime(ticks?: number): string {
  if (!ticks) return "";
  const totalMinutes = Math.floor(ticks / 10000000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}