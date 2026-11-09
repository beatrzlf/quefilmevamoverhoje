export function posterUrl(path: string | null, size: "w92" | "w185" | "w342" = "w185"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
