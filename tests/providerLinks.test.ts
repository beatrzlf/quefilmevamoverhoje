import { describe, expect, it } from "vitest";
import { providerUrl } from "@/lib/providerLinks";

describe("links dos streamings", () => {
  it("abre a busca do serviço com o título", () => {
    expect(providerUrl("Netflix", "Cidade de Deus", null)).toBe("https://www.netflix.com/search?q=Cidade%20de%20Deus");
    expect(providerUrl("Amazon Prime Video", "Matrix", null)).toContain("primevideo.com");
    expect(providerUrl("Max", "Duna", null)).toContain("hbomax.com");
    expect(providerUrl("Netflix Standard with Ads", "Duna", null)).toContain("netflix.com");
  });
  it("usa a página do TMDB para serviços desconhecidos", () => {
    expect(providerUrl("Serviço X", "Duna", "https://www.themoviedb.org/movie/1/watch")).toBe("https://www.themoviedb.org/movie/1/watch");
    expect(providerUrl("Serviço X", "Duna", null)).toBeNull();
  });
  it("não deixa o título quebrar a URL", () => {
    expect(providerUrl("Netflix", "a&b=c#d", null)).toBe("https://www.netflix.com/search?q=a%26b%3Dc%23d");
  });
});
