import { describe, expect, it } from "vitest";
import { exportText, parseText, pickBestMatch } from "@/lib/textList";

const matrix = { id: 603, title: "Matrix", originalTitle: "The Matrix", year: "1999", overview: "", posterPath: null, rating: 8.2, imdbId: "tt0133093" };
const up = { id: 14160, title: "Up: Altas Aventuras", originalTitle: "Up", year: "2009", overview: "", posterPath: null, rating: 7.9, imdbId: null };

describe("txt", () => {
  it("ida e volta mantém IDs e seções", () => {
    const txt = exportText({ suggestions: [matrix], watched: [{ ...up, watchedAt: "2026-11-09T00:00:00.000Z" }] });
    expect(txt).toContain("Matrix (1999) [tmdb:603] [imdb:tt0133093]");
    const p = parseText(txt);
    expect(p.suggestions).toEqual([{ title: "Matrix", year: "1999", tmdbId: 603, imdbId: "tt0133093" }]);
    expect(p.watched).toEqual([{ title: "Up: Altas Aventuras", year: "2009", tmdbId: 14160, imdbId: null }]);
  });
  it("aceita lista simples digitada à mão", () => {
    const p = parseText("Matrix\n- Cidade de Deus (2002)\n2. Parasita\n\n");
    expect(p.suggestions.map((e) => [e.title, e.year, e.tmdbId])).toEqual([
      ["Matrix", null, null],
      ["Cidade de Deus", "2002", null],
      ["Parasita", null, null],
    ]);
    expect(p.watched).toEqual([]);
  });
  it("rejeita arquivo vazio ou grande demais", () => {
    expect(() => parseText("# só comentário\n")).toThrow(/Nenhum/);
    expect(() => parseText("a\n".repeat(201))).toThrow(/mais de/);
  });
  it("escolhe o resultado do mesmo ano e título", () => {
    const other = { ...matrix, id: 1, title: "Matrix Reloaded", year: "2003" };
    expect(pickBestMatch({ title: "matrix", year: null, tmdbId: null, imdbId: null }, [other, matrix])?.id).toBe(603);
    expect(pickBestMatch({ title: "Matrix Reloaded", year: "2003", tmdbId: null, imdbId: null }, [matrix, other])?.id).toBe(1);
  });
});
