import type { Movie } from "./types";
import { isValidImdbId, isValidPosterPath, sanitizeRecommender } from "./validation";

export const STORAGE_KEY = "qfvh:v1";
const MAX_ITEMS = 200;

export interface SavedState {
  suggestions: Movie[];
  watched: (Movie & { watchedAt: string })[];
  /** Sorteados que não estavam em nenhum streaming: ficam fora da roleta. */
  noStreaming: Movie[];
}

export const emptyState: SavedState = { suggestions: [], watched: [], noStreaming: [] };

/* eslint-disable @typescript-eslint/no-explicit-any */
function cleanMovie(m: any): Movie | null {
  if (!m || !Number.isInteger(m.id) || m.id <= 0 || typeof m.title !== "string") return null;
  const recommendedBy = sanitizeRecommender(m.recommendedBy);
  return {
    id: m.id,
    title: m.title.slice(0, 200),
    originalTitle: typeof m.originalTitle === "string" ? m.originalTitle.slice(0, 200) : "",
    year: typeof m.year === "string" && /^\d{4}$/.test(m.year) ? m.year : null,
    overview: typeof m.overview === "string" ? m.overview.slice(0, 600) : "",
    posterPath: isValidPosterPath(m.posterPath) ? m.posterPath : null,
    rating: typeof m.rating === "number" ? m.rating : null,
    imdbId: isValidImdbId(m.imdbId) ? m.imdbId : null,
    ...(recommendedBy ? { recommendedBy } : {}),
  };
}

/** Lê e valida o que está salvo; dados corrompidos ou adulterados são descartados. */
export function parseState(raw: string | null): SavedState {
  if (!raw) return emptyState;
  try {
    const data = JSON.parse(raw);
    const suggestions = (Array.isArray(data?.suggestions) ? data.suggestions : [])
      .map(cleanMovie)
      .filter(Boolean)
      .slice(0, MAX_ITEMS) as Movie[];
    const watched = (Array.isArray(data?.watched) ? data.watched : [])
      .map((w: any) => {
        const m = cleanMovie(w);
        const at = typeof w?.watchedAt === "string" && !Number.isNaN(Date.parse(w.watchedAt)) ? w.watchedAt : new Date(0).toISOString();
        return m ? { ...m, watchedAt: at } : null;
      })
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
    // Campo novo: listas salvas antes dele simplesmente não têm a chave.
    const noStreaming = (Array.isArray(data?.noStreaming) ? data.noStreaming : [])
      .map(cleanMovie)
      .filter(Boolean)
      .slice(0, MAX_ITEMS) as Movie[];
    return { suggestions, watched, noStreaming };
  } catch {
    return emptyState;
  }
}

export function loadState(): SavedState {
  try {
    return parseState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyState;
  }
}

export function saveState(state: SavedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* navegação privada ou armazenamento cheio: segue só em memória */
  }
}

export const EXPORT_APP_ID = "quefilmevamoverhoje";
export const MAX_IMPORT_BYTES = 1_000_000;

/** Gera o conteúdo do arquivo de exportação (JSON legível). */
export function exportState(state: SavedState, now = new Date()): string {
  return JSON.stringify(
    { app: EXPORT_APP_ID, version: 1, exportedAt: now.toISOString(), suggestions: state.suggestions, watched: state.watched, noStreaming: state.noStreaming },
    null,
    2,
  );
}

/**
 * Valida um arquivo importado. Lança erro amigável se não for um export válido.
 * Todo o conteúdo passa pela mesma limpeza do armazenamento local.
 */
export function parseImport(text: string): SavedState {
  if (text.length > MAX_IMPORT_BYTES) throw new Error("Arquivo grande demais (máx. 1 MB).");
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  if (data?.app !== EXPORT_APP_ID) throw new Error("Este arquivo não foi exportado pela roleta.");
  return parseState(text);
}

/** Junta a lista importada com a atual, sem duplicar filmes. */
export function mergeState(current: SavedState, incoming: SavedState): SavedState {
  // Se o filme já existe sem "indicado por", aproveita o nome que veio no arquivo.
  const names = new Map<number, string>();
  for (const m of [...incoming.suggestions, ...incoming.watched, ...incoming.noStreaming]) if (m.recommendedBy && !names.has(m.id)) names.set(m.id, m.recommendedBy);
  const fill = <T extends Movie>(m: T): T => (!m.recommendedBy && names.has(m.id) ? { ...m, recommendedBy: names.get(m.id) } : m);
  current = { suggestions: current.suggestions.map(fill), watched: current.watched.map(fill), noStreaming: current.noStreaming.map(fill) };
  const watchedIds = new Set([...current.watched, ...incoming.watched].map((m) => m.id));
  const seen = new Set<number>();
  const suggestions = [...current.suggestions, ...incoming.suggestions].filter((m) => {
    if (seen.has(m.id) || watchedIds.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  const seenW = new Set<number>();
  const watched = [...current.watched, ...incoming.watched].filter((m) => {
    if (seenW.has(m.id)) return false;
    seenW.add(m.id);
    return true;
  });
  // "Streaming não encontrado": o que já está na roleta ou foi assistido tem prioridade.
  const taken = new Set([...watchedIds, ...seen]);
  const noStreaming = [...current.noStreaming, ...incoming.noStreaming].filter((m) => {
    if (taken.has(m.id)) return false;
    taken.add(m.id);
    return true;
  });
  return { suggestions: suggestions.slice(0, MAX_ITEMS), watched: watched.slice(0, MAX_ITEMS), noStreaming: noStreaming.slice(0, MAX_ITEMS) };
}
