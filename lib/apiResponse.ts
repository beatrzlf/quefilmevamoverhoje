import { NextResponse } from "next/server";
import { TmdbConfigError } from "./tmdb";

export function jsonError(message: string, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...extra } });
}

/** Converte erros internos em respostas genéricas, sem vazar detalhes ou a chave. */
export function handleUpstreamError(err: unknown) {
  if (err instanceof TmdbConfigError) {
    console.error(err.message);
    return jsonError("Servidor sem chave do TMDB configurada.", 503);
  }
  console.error("Falha ao consultar o TMDB:", err instanceof Error ? err.message : err);
  return jsonError("Não foi possível consultar os filmes agora. Tente de novo.", 502);
}
