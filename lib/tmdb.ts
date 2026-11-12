import "server-only";
import type { Movie } from "./types";
import { isValidImdbId, isValidPosterPath } from "./validation";
import { parseWatchProviders, WATCH_REGION, type WatchProviders } from "./providers";

const BASE = "https://api.themoviedb.org/3";

export class TmdbConfigError extends Error {}

function authInit(): { headers: Record<string, string>; keyParam: string | null } {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const key = process.env.TMDB_API_KEY;
  if (token) return { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, keyParam: null };
  if (key) return { headers: { Accept: "application/json" }, keyParam: key };
  throw new TmdbConfigError("TMDB_READ_ACCESS_TOKEN ou TMDB_API_KEY não configurado");
}

async function tmdbGet(path: string, params: Record<string, string>, revalidate: number) {
  const { headers, keyParam } = authInit();
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (keyParam) url.searchParams.set("api_key", keyParam);
  const res = await fetch(url, { headers, next: { revalidate }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`TMDB respondeu ${res.status}`);
  return res.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toMovie(raw: any): Movie {
  const date = typeof raw?.release_date === "string" ? raw.release_date : "";
  return {
    id: Number(raw?.id),
    title: String(raw?.title ?? raw?.original_title ?? "Sem título").slice(0, 200),
    originalTitle: String(raw?.original_title ?? "").slice(0, 200),
    year: /^\d{4}/.test(date) ? date.slice(0, 4) : null,
    overview: String(raw?.overview ?? "").slice(0, 600),
    posterPath: isValidPosterPath(raw?.poster_path) ? raw.poster_path : null,
    rating: typeof raw?.vote_average === "number" && raw.vote_count > 0 ? Math.round(raw.vote_average * 10) / 10 : null,
    imdbId: isValidImdbId(raw?.imdb_id) ? raw.imdb_id : isValidImdbId(raw?.external_ids?.imdb_id) ? raw.external_ids.imdb_id : null,
  };
}

export async function searchMovies(query: string): Promise<Movie[]> {
  const data = await tmdbGet(
    "/search/movie",
    { query, language: "pt-BR", include_adult: "false", page: "1" },
    3600,
  );
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  return results
    .filter((r) => Number.isInteger(r?.id))
    // Ordena por popularidade para que o filme mais provável apareça primeiro
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 10)
    .map(toMovie);
}

export async function getMovie(id: number): Promise<Movie> {
  const data = await tmdbGet(`/movie/${id}`, { language: "pt-BR", append_to_response: "external_ids" }, 86400);
  return toMovie(data);
}

/** Onde o filme está disponível no Brasil. Muda com frequência, então o cache é de 6 horas. */
export async function getWatchProviders(id: number): Promise<WatchProviders> {
  const data = await tmdbGet(`/movie/${id}/watch/providers`, {}, 21600);
  return parseWatchProviders(data, WATCH_REGION);
}
