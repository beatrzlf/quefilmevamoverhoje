import { NextRequest, NextResponse } from "next/server";
import { getMovie } from "@/lib/tmdb";
import { parseMovieId } from "@/lib/validation";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";
import { handleUpstreamError, jsonError } from "@/lib/apiResponse";

const limiter = createRateLimiter(60, 60_000);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = limiter(clientIp(req.headers));
  if (!rl.ok) return jsonError("Muitas requisições seguidas. Aguarde um pouco.", 429, { "Retry-After": String(rl.retryAfter) });

  const id = parseMovieId((await params).id);
  if (!id) return jsonError("ID de filme inválido.", 400);

  try {
    const movie = await getMovie(id);
    return NextResponse.json(
      { movie },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (err) {
    return handleUpstreamError(err);
  }
}
