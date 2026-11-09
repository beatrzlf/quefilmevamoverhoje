import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";
import { sanitizeQuery } from "@/lib/validation";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";
import { handleUpstreamError, jsonError } from "@/lib/apiResponse";

const limiter = createRateLimiter(40, 60_000);

export async function GET(req: NextRequest) {
  const rl = limiter(clientIp(req.headers));
  if (!rl.ok) return jsonError("Muitas buscas seguidas. Aguarde um pouco.", 429, { "Retry-After": String(rl.retryAfter) });

  const q = sanitizeQuery(req.nextUrl.searchParams.get("q"));
  if (!q) return jsonError("Digite entre 2 e 100 caracteres.", 400);

  try {
    const results = await searchMovies(q);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    return handleUpstreamError(err);
  }
}
