/**
 * Links para procurar o filme dentro de cada streaming.
 * O TMDB não fornece o link direto do filme em cada serviço (só a JustWatch, com contrato),
 * então abrimos a busca do próprio serviço com o título. Para serviços sem busca conhecida,
 * usamos a página "onde assistir" do TMDB, que tem os links diretos.
 */
const SEARCH: { match: RegExp; url: (q: string) => string }[] = [
  { match: /netflix/i, url: (q) => `https://www.netflix.com/search?q=${q}` },
  { match: /amazon|prime video/i, url: (q) => `https://www.primevideo.com/search?phrase=${q}` },
  { match: /disney/i, url: (q) => `https://www.disneyplus.com/pt-br/search?q=${q}` },
  { match: /^(hbo )?max\b|hbo max/i, url: (q) => `https://play.hbomax.com/search?q=${q}` },
  { match: /globoplay/i, url: (q) => `https://globoplay.globo.com/busca/?q=${q}` },
  { match: /apple tv/i, url: (q) => `https://tv.apple.com/br/search?term=${q}` },
  { match: /google play/i, url: (q) => `https://play.google.com/store/search?q=${q}&c=movies` },
  { match: /youtube/i, url: (q) => `https://www.youtube.com/results?search_query=${q}` },
  { match: /paramount/i, url: (q) => `https://www.paramountplus.com/br/search/?q=${q}` },
  { match: /mubi/i, url: (q) => `https://mubi.com/pt/br/search/films?query=${q}` },
  { match: /crunchyroll/i, url: (q) => `https://www.crunchyroll.com/pt-br/search?q=${q}` },
  { match: /pluto/i, url: (q) => `https://pluto.tv/br/search/details?query=${q}` },
];

export function providerUrl(providerName: string, movieTitle: string, fallback: string | null): string | null {
  const q = encodeURIComponent(movieTitle.trim());
  const hit = q ? SEARCH.find((s) => s.match.test(providerName)) : undefined;
  return hit ? hit.url(q) : fallback;
}
