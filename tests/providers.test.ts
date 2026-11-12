import { describe, expect, it } from "vitest";
import { parseWatchProviders } from "@/lib/providers";

const sample = {
  id: 603,
  results: {
    US: { flatrate: [{ provider_id: 9, provider_name: "US only", logo_path: "/us.jpg", display_priority: 0 }] },
    BR: {
      link: "https://www.themoviedb.org/movie/603-the-matrix/watch?locale=BR",
      flatrate: [
        { provider_id: 1899, provider_name: "Max", logo_path: "/max.jpg", display_priority: 5 },
        { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg", display_priority: 1 },
      ],
      ads: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg", display_priority: 1 }],
      rent: [
        { provider_id: 2, provider_name: "Apple TV", logo_path: "/apple.jpg", display_priority: 3 },
        { provider_id: 3, provider_name: "Ruim", logo_path: "//evil.com/x.jpg", display_priority: 0 },
      ],
      buy: [{ provider_id: 2, provider_name: "Apple TV", logo_path: "/apple.jpg", display_priority: 3 }],
    },
  },
};

describe("onde assistir", () => {
  it("usa só o Brasil, ordena por prioridade e não repete serviços", () => {
    const p = parseWatchProviders(sample);
    expect(p.streaming.map((x) => x.name)).toEqual(["Netflix", "Max"]);
    expect(p.rent.map((x) => x.name)).toEqual(["Apple TV"]);
    expect(p.buy).toHaveLength(1);
    expect(p.link).toContain("themoviedb.org");
  });
  it("devolve vazio quando não há dados do Brasil", () => {
    expect(parseWatchProviders({ results: {} })).toEqual({ link: null, streaming: [], rent: [], buy: [] });
    expect(parseWatchProviders(null).streaming).toEqual([]);
  });
  it("descarta links fora do TMDB", () => {
    expect(parseWatchProviders({ results: { BR: { link: "javascript:alert(1)" } } }).link).toBeNull();
    expect(parseWatchProviders({ results: { BR: { link: "https://evil.com/x" } } }).link).toBeNull();
  });
});
