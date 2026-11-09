export const MAX_QUERY_LENGTH = 100;

/**
 * Normaliza e valida o termo de busca. Retorna null se for inválido.
 * Remove caracteres de controle e limita o tamanho para evitar abuso.
 */
export function sanitizeQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || cleaned.length > MAX_QUERY_LENGTH) return null;
  return cleaned;
}

/** Aceita apenas IDs numéricos positivos do TMDB. */
export function parseMovieId(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}

/** Aceita apenas IDs do IMDb no formato tt + dígitos. */
export function isValidImdbId(raw: unknown): raw is string {
  return typeof raw === "string" && /^tt\d{5,10}$/.test(raw);
}

/** Aceita apenas caminhos de pôster do TMDB (ex.: /abc123.jpg). */
export function isValidPosterPath(raw: unknown): raw is string {
  return typeof raw === "string" && /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(raw);
}
