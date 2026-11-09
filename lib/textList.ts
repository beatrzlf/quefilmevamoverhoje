import type { SavedState } from "./storage";
import type { Movie } from "./types";
import { isValidImdbId } from "./validation";

export const MAX_IMPORT_LINES = 200;
export const MAX_IMPORT_CHARS = 200_000;

const HEADER = "# Qual filme vamo ver hoje? - lista de filmes";
const SUGGESTIONS = "[Sugestões]";
const WATCHED = "[Já assistidos]";

/** Uma linha do arquivo .txt, já interpretada. */
export interface TextEntry {
  title: string;
  year: string | null;
  tmdbId: number | null;
  imdbId: string | null;
}

function line(m: Movie): string {
  const title = m.title.replace(/[\r\n[\]]/g, " ").trim();
  let s = title;
  if (m.year) s += ` (${m.year})`;
  s += ` [tmdb:${m.id}]`;
  if (m.imdbId) s += ` [imdb:${m.imdbId}]`;
  return s;
}

/**
 * Gera o .txt: um filme por linha, fácil de ler, editar e compartilhar.
 * As marcas [tmdb:…] permitem reimportar o filme exato; sem elas, o título é buscado.
 */
export function exportText(state: SavedState, now = new Date()): string {
  return [
    HEADER,
    `# Exportada em ${now.toISOString().slice(0, 10)}. Um filme por linha.`,
    "# Você pode escrever só o título (ex.: Matrix ou Matrix (1999)) que a roleta busca o filme ao importar.",
    "",
    SUGGESTIONS,
    ...state.suggestions.map(line),
    "",
    WATCHED,
    ...state.watched.map(line),
    "",
  ].join("\n");
}

function parseLine(raw: string): TextEntry | null {
  let s = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
  if (!s) return null;
  let tmdbId: number | null = null;
  let imdbId: string | null = null;
  s = s.replace(/\[\s*tmdb\s*:\s*(\d{1,9})\s*\]/i, (_, id) => {
    tmdbId = Number(id) || null;
    return "";
  });
  s = s.replace(/\[\s*imdb\s*:\s*(tt\d{5,10})\s*\]/i, (_, id) => {
    imdbId = isValidImdbId(id) ? id : null;
    return "";
  });
  s = s.trim();
  let year: string | null = null;
  const ym = s.match(/\s*\((\d{4})\)\s*$/);
  if (ym) {
    year = ym[1];
    s = s.slice(0, ym.index).trim();
  }
  // eslint-disable-next-line no-control-regex
  const title = s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!title && !tmdbId) return null;
  return { title, year, tmdbId, imdbId };
}

/**
 * Lê um .txt. Linhas com # são comentários. Linhas depois de [Já assistidos]
 * vão para o histórico; o resto (inclusive um arquivo só com títulos) vira sugestão.
 */
export function parseText(text: string): { suggestions: TextEntry[]; watched: TextEntry[] } {
  if (text.length > MAX_IMPORT_CHARS) throw new Error("Arquivo grande demais.");
  const out = { suggestions: [] as TextEntry[], watched: [] as TextEntry[] };
  let section: "suggestions" | "watched" = "suggestions";
  let count = 0;
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const t = raw.trim();
    if (!t || t.startsWith("#")) continue;
    const head = t.toLowerCase().replace(/[[\]:]/g, "").trim();
    if (/^(já |ja )?assistidos$/.test(head)) { section = "watched"; continue; }
    if (/^sugest(õ|o)es$/.test(head)) { section = "suggestions"; continue; }
    const e = parseLine(t);
    if (!e) continue;
    if (++count > MAX_IMPORT_LINES) throw new Error(`O arquivo tem mais de ${MAX_IMPORT_LINES} filmes.`);
    out[section].push(e);
  }
  if (count === 0) throw new Error("Nenhum filme encontrado no arquivo.");
  return out;
}

/** Filme mínimo a partir da linha, para quando não dá para consultar o TMDB. */
export function entryToMovie(e: TextEntry): Movie | null {
  if (!e.tmdbId) return null;
  return { id: e.tmdbId, title: e.title || "Sem título", originalTitle: "", year: e.year, overview: "", posterPath: null, rating: null, imdbId: e.imdbId };
}

/** Escolhe o melhor resultado da busca para um título digitado. */
export function pickBestMatch(e: TextEntry, results: Movie[]): Movie | null {
  if (!results.length) return null;
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const t = norm(e.title);
  const sameYear = e.year ? results.filter((m) => m.year === e.year) : results;
  const pool = sameYear.length ? sameYear : results;
  return pool.find((m) => norm(m.title) === t || norm(m.originalTitle) === t) ?? pool[0];
}
