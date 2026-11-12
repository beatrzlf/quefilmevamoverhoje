import { isValidPosterPath } from "./validation";

/** Um serviço onde o filme está disponível (Netflix, Prime Video…). */
export interface Provider {
  id: number;
  name: string;
  logoPath: string;
}

/** Onde assistir um filme em uma região. Dados do TMDB, fornecidos pela JustWatch. */
export interface WatchProviders {
  /** Página do TMDB com os links para cada serviço */
  link: string | null;
  /** Incluso na assinatura, grátis ou com anúncios */
  streaming: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export const WATCH_REGION = "BR";
export const emptyProviders: WatchProviders = { link: null, streaming: [], rent: [], buy: [] };

/* eslint-disable @typescript-eslint/no-explicit-any */
function toProviders(...lists: unknown[]): Provider[] {
  const seen = new Set<number>();
  const out: { p: Provider; prio: number }[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list as any[]) {
      const id = Number(raw?.provider_id);
      if (!Number.isInteger(id) || id <= 0 || seen.has(id) || !isValidPosterPath(raw?.logo_path)) continue;
      seen.add(id);
      out.push({
        p: { id, name: String(raw?.provider_name ?? "").slice(0, 80), logoPath: raw.logo_path },
        prio: typeof raw?.display_priority === "number" ? raw.display_priority : 999,
      });
    }
  }
  return out.sort((a, b) => a.prio - b.prio).slice(0, 12).map((x) => x.p);
}

function safeLink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname === "www.themoviedb.org" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Converte a resposta de /movie/{id}/watch/providers para a região escolhida. */
export function parseWatchProviders(data: any, region = WATCH_REGION): WatchProviders {
  const r = data?.results?.[region];
  if (!r || typeof r !== "object") return emptyProviders;
  return {
    link: safeLink(r.link),
    streaming: toProviders(r.flatrate, r.free, r.ads),
    rent: toProviders(r.rent),
    buy: toProviders(r.buy),
  };
}

export function logoUrl(path: string, size: "w45" | "w92" = "w92"): string {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
