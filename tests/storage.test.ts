import { describe, expect, it } from "vitest";
import { exportState, mergeState, parseImport, parseState } from "@/lib/storage";

const matrix = { id: 603, title: "Matrix", originalTitle: "The Matrix", year: "1999", overview: "", posterPath: null, rating: 8.2, imdbId: "tt0133093" };
const up = { id: 14160, title: "Up", originalTitle: "Up", year: "2009", overview: "", posterPath: null, rating: 7.9, imdbId: null };

describe("exportar / importar", () => {
  it("ida e volta preserva a lista", () => {
    const state = { suggestions: [matrix], watched: [{ ...up, watchedAt: "2026-11-09T00:00:00.000Z" }], noStreaming: [] };
    expect(parseImport(exportState(state))).toEqual(state);
  });
  it("rejeita arquivos inválidos", () => {
    expect(() => parseImport("não é json")).toThrow(/JSON/);
    expect(() => parseImport(JSON.stringify({ suggestions: [] }))).toThrow(/exportado/);
  });
  it("descarta itens adulterados", () => {
    const s = parseState(JSON.stringify({ suggestions: [matrix, { id: "x" }, { ...up, imdbId: "javascript:alert(1)", posterPath: "//evil" }] }));
    expect(s.suggestions).toHaveLength(2);
    expect(s.suggestions[1].imdbId).toBeNull();
    expect(s.suggestions[1].posterPath).toBeNull();
  });
  it("junta sem duplicar e respeita os assistidos", () => {
    const merged = mergeState(
      { suggestions: [matrix], watched: [], noStreaming: [] },
      { suggestions: [matrix, up], watched: [{ ...matrix, watchedAt: "2026-01-01T00:00:00.000Z" }], noStreaming: [] },
    );
    expect(merged.suggestions.map((m) => m.id)).toEqual([14160]);
    expect(merged.watched.map((m) => m.id)).toEqual([603]);
  });
});

describe("indicado por no armazenamento", () => {
  it("preserva, limpa e aceita listas antigas", () => {
    const s = parseState(JSON.stringify({ suggestions: [{ ...matrix, recommendedBy: "  Ana\n[x] " }, { ...up, recommendedBy: 42 }, up] }));
    expect(s.suggestions[0].recommendedBy).toBe("Ana x");
    expect(s.suggestions[1]).not.toHaveProperty("recommendedBy");
    expect(s.suggestions[2]).toEqual(up);
  });
  it("ao juntar, completa quem indicou sem sobrescrever", () => {
    const merged = mergeState(
      { suggestions: [matrix, { ...up, recommendedBy: "Ana" }], watched: [], noStreaming: [] },
      { suggestions: [{ ...matrix, recommendedBy: "Bia" }, { ...up, recommendedBy: "Caio" }], watched: [], noStreaming: [] },
    );
    expect(merged.suggestions.map((m) => m.recommendedBy)).toEqual(["Bia", "Ana"]);
  });
});

describe("streaming não encontrado", () => {
  it("listas salvas antes do campo carregam com a lista vazia", () => {
    expect(parseState(JSON.stringify({ suggestions: [matrix], watched: [] })).noStreaming).toEqual([]);
  });
  it("ao juntar, roleta e assistidos têm prioridade e não há duplicatas", () => {
    const merged = mergeState(
      { suggestions: [matrix], watched: [], noStreaming: [up] },
      { suggestions: [], watched: [], noStreaming: [matrix, up] },
    );
    expect(merged.suggestions.map((m) => m.id)).toEqual([603]);
    expect(merged.noStreaming.map((m) => m.id)).toEqual([14160]);
  });
});
