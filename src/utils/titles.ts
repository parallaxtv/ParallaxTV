export function normalizeTitle(title?: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/^(the |a |an )/i, "") // Keeping your smart article stripping!
    .replace(/[^a-z0-9]/g, "");
}