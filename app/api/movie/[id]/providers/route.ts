import { NextRequest, NextResponse } from "next/server";
import { getWatchProviders } from "@/lib/tmdb";
import { parseMovieId } from "@/lib/validation";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";
import { handleUpstreamError, jsonError } from "@/lib/apiResponse";

// Limite mais folgado: a lista pede os streamings de vários filmes de uma vez.
const limiter = createRateLimiter(240, 60_000);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = limiter(clientIp(req.headers));
  if (!rl.ok) return jsonError("Muitas requisições seguidas. Aguarde um pouco.", 429, { "Retry-After": String(rl.retryAfter) });

  const id = parseMovieId((await params).id);
  if (!id) return jsonError("ID de filme inválido.", 400);

  try {
    const providers = await getWatchProviders(id);
    return NextResponse.json(
      { providers },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    return handleUpstreamError(err);
  }
}
