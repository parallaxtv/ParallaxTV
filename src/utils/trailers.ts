export function extractYoutubeKey(url?: string | null): string | null {
  if (!url) return null;
  const regex = /(?:v=|youtu\.be\/)([^&?/]+)/;
  const match = url.match(regex);
  return match?.[1] ?? null;
}