import { describe, expect, it } from "vitest";
import { isValidImdbId, isValidPosterPath, parseMovieId, sanitizeQuery } from "@/lib/validation";
import { createRateLimiter } from "@/lib/rateLimit";
import { toMovie } from "@/lib/tmdb";

describe("validação", () => {
  it("limpa a busca", () => {
    expect(sanitizeQuery("  Matrix \n ")).toBe("Matrix");
    expect(sanitizeQuery("a")).toBeNull();
    expect(sanitizeQuery("x".repeat(101))).toBeNull();
    expect(sanitizeQuery(undefined)).toBeNull();
  });
  it("valida IDs", () => {
    expect(parseMovieId("603")).toBe(603);
    expect(parseMovieId("603; drop")).toBeNull();
    expect(parseMovieId("0")).toBeNull();
    expect(isValidImdbId("tt0133093")).toBe(true);
    expect(isValidImdbId("javascript:alert(1)")).toBe(false);
    expect(isValidPosterPath("/abc_1-2.jpg")).toBe(true);
    expect(isValidPosterPath("//evil.com/x.jpg")).toBe(false);
  });
});

describe("rate limit", () => {
  it("bloqueia depois do limite e libera na próxima janela", () => {
    const check = createRateLimiter(2, 1000);
    expect(check("ip", 0).ok).toBe(true);
    expect(check("ip", 1).ok).toBe(true);
    expect(check("ip", 2).ok).toBe(false);
    expect(check("ip", 1001).ok).toBe(true);
  });
});

describe("toMovie", () => {
  it("normaliza a resposta do TMDB", () => {
    const m = toMovie({ id: 603, title: "Matrix", original_title: "The Matrix", release_date: "1999-03-30", poster_path: "/p.jpg", vote_average: 8.217, vote_count: 10, external_ids: { imdb_id: "tt0133093" } });
    expect(m).toMatchObject({ id: 603, year: "1999", rating: 8.2, imdbId: "tt0133093", posterPath: "/p.jpg" });
    expect(toMovie({ id: 1, poster_path: "http://x" }).posterPath).toBeNull();
  });
});
