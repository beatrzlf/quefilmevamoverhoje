/**
 * Limitador de requisições simples em memória (janela fixa por IP).
 * Em funções serverless da Vercel cada instância tem a própria memória,
 * então isto é uma proteção de "melhor esforço" contra abuso da chave do TMDB.
 * Para limites globais, troque por Vercel KV / Upstash Redis.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now = Date.now()): { ok: boolean; retryAfter: number } {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return { ok: true, retryAfter: 0 };
    }
    entry.count += 1;
    if (entry.count > limit) {
      return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    return { ok: true, retryAfter: 0 };
  };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon"
  );
}
