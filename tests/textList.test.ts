import { describe, expect, it } from "vitest";
import { exportText, parseText, pickBestMatch } from "@/lib/textList";

const matrix = { id: 603, title: "Matrix", originalTitle: "The Matrix", year: "1999", overview: "", posterPath: null, rating: 8.2, imdbId: "tt0133093" };
const up = { id: 14160, title: "Up: Altas Aventuras", originalTitle: "Up", year: "2009", overview: "", posterPath: null, rating: 7.9, imdbId: null };

describe("txt", () => {
  it("ida e volta mantém IDs e seções", () => {
    const txt = exportText({ suggestions: [matrix], watched: [{ ...up, watchedAt: "2026-11-09T00:00:00.000Z" }], noStreaming: [] });
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

describe("indicado por", () => {
  it("exporta e reimporta quem indicou", () => {
    const txt = exportText({ suggestions: [{ ...matrix, recommendedBy: "Ana" }], watched: [{ ...up, recommendedBy: "João", watchedAt: "2026-11-09T00:00:00.000Z" }], noStreaming: [] });
    expect(txt).toContain("Matrix (1999) [tmdb:603] [imdb:tt0133093] [por:Ana]");
    const p = parseText(txt);
    expect(p.suggestions[0]).toEqual({ title: "Matrix", year: "1999", tmdbId: 603, imdbId: "tt0133093", recommendedBy: "Ana" });
    expect(p.watched[0].recommendedBy).toBe("João");
  });
  it("aceita a marca escrita à mão e arquivos antigos sem ela", () => {
    const p = parseText("Parasita (2019) [indicado por: Bia]\nMatrix [tmdb:603]");
    expect(p.suggestions[0]).toMatchObject({ title: "Parasita", year: "2019", recommendedBy: "Bia" });
    expect(p.suggestions[1].recommendedBy).toBeUndefined();
  });
});

describe("streaming não encontrado", () => {
  it("exporta e reimporta a lista separada", () => {
    const txt = exportText({ suggestions: [matrix], watched: [], noStreaming: [{ ...up, recommendedBy: "Bia" }] });
    expect(txt).toContain("[Streaming não encontrado]\nUp: Altas Aventuras (2009) [tmdb:14160] [por:Bia]");
    const p = parseText(txt);
    expect(p.suggestions.map((e) => e.tmdbId)).toEqual([603]);
    expect(p.noStreaming).toEqual([{ title: "Up: Altas Aventuras", year: "2009", tmdbId: 14160, imdbId: null, recommendedBy: "Bia" }]);
  });
  it("arquivos antigos, sem a seção, continuam funcionando", () => {
    const p = parseText("[Sugestões]\nMatrix\n\n[Já assistidos]\nUp");
    expect(p.noStreaming).toEqual([]);
    expect(p.watched).toHaveLength(1);
  });
});
