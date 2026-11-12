"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SearchBar from "@/components/SearchBar";
import Wheel from "@/components/Wheel";
import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/lib/types";
import { emptyState, loadState, mergeState, MAX_IMPORT_BYTES, parseImport, saveState, type SavedState } from "@/lib/storage";
import { entryToMovie, exportText, parseText, pickBestMatch, type TextEntry } from "@/lib/textList";
import { randomIndex, targetRotation } from "@/lib/roulette";
import { posterUrl } from "@/lib/poster";
import { AUTHOR_NAME, AUTHOR_URL } from "@/lib/site";

export default function Home() {
  const [state, setState] = useState<SavedState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Movie | null>(null);
  const [showWatched, setShowWatched] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setState(loadState());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (picked && !d.open) d.showModal();
    if (!picked && d.open) d.close();
  }, [picked]);

  const { suggestions, watched } = state;
  const isAdded = useCallback((id: number) => suggestions.some((m) => m.id === id), [suggestions]);

  async function addMovie(movie: Movie) {
    setState((s) => (s.suggestions.some((m) => m.id === movie.id) ? s : { ...s, suggestions: [...s.suggestions, movie] }));
    // Busca o ID do IMDb em segundo plano (melhor esforço).
    try {
      const res = await fetch(`/api/movie/${movie.id}`);
      if (!res.ok) return;
      const { movie: full } = (await res.json()) as { movie: Movie };
      setState((s) => ({
        ...s,
        suggestions: s.suggestions.map((m) => (m.id === full.id ? { ...m, imdbId: full.imdbId, overview: full.overview || m.overview } : m)),
      }));
    } catch {
      /* ignora */
    }
  }

  function removeMovie(id: number) {
    setState((s) => ({ ...s, suggestions: s.suggestions.filter((m) => m.id !== id) }));
  }

  function markWatched(movie: Movie) {
    setState((s) => ({
      suggestions: s.suggestions.filter((m) => m.id !== movie.id),
      watched: [{ ...movie, watchedAt: new Date().toISOString() }, ...s.watched.filter((m) => m.id !== movie.id)],
    }));
  }

  function restore(id: number) {
    setState((s) => {
      const m = s.watched.find((w) => w.id === id);
      if (!m) return s;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { watchedAt, ...movie } = m;
      return {
        suggestions: s.suggestions.some((x) => x.id === id) ? s.suggestions : [...s.suggestions, movie],
        watched: s.watched.filter((w) => w.id !== id),
      };
    });
  }

  function clearAll() {
    if (window.confirm("Apagar todas as sugestões e o histórico deste navegador?")) setState(emptyState);
  }

  const [importing, setImporting] = useState<string | null>(null);

  function exportList() {
    const blob = new Blob([exportText(state)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roleta-de-filmes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ kind: "ok", text: "Lista exportada em .txt. Guarde o arquivo para importar depois." });
  }

  /** Transforma uma linha do .txt em filme: pelo ID do TMDB ou buscando o título. */
  async function resolveEntry(e: TextEntry): Promise<Movie | null> {
    try {
      if (e.tmdbId) {
        const res = await fetch(`/api/movie/${e.tmdbId}`);
        if (res.ok) return ((await res.json()) as { movie: Movie }).movie;
        return entryToMovie(e);
      }
      if (e.title.length < 2) return null;
      const res = await fetch(`/api/search?q=${encodeURIComponent(e.title)}`);
      if (!res.ok) return null;
      return pickBestMatch(e, ((await res.json()) as { results: Movie[] }).results);
    } catch {
      return entryToMovie(e);
    }
  }

  async function resolveAll(entries: TextEntry[], label: string, offset: number, total: number) {
    const found: Movie[] = [];
    const missing: string[] = [];
    // Poucas requisições por vez para respeitar o limite da API.
    for (let i = 0; i < entries.length; i += 4) {
      const batch = entries.slice(i, i + 4);
      setImporting(`Importando ${label}… ${Math.min(offset + i + batch.length, total)}/${total}`);
      const res = await Promise.all(batch.map(resolveEntry));
      res.forEach((m, j) => (m ? found.push(m) : missing.push(batch[j].title)));
    }
    return { found, missing };
  }

  async function importList(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("Arquivo grande demais (máx. 1 MB).");
      const text = await file.text();
      let incoming: SavedState;
      let missing: string[] = [];
      if (text.trimStart().startsWith("{")) {
        // Compatibilidade com arquivos .json exportados pela versão anterior.
        incoming = parseImport(text);
      } else {
        const parsed = parseText(text);
        const total = parsed.suggestions.length + parsed.watched.length;
        const sug = await resolveAll(parsed.suggestions, "filmes", 0, total);
        const wat = await resolveAll(parsed.watched, "filmes", parsed.suggestions.length, total);
        const now = new Date().toISOString();
        const uniq = (list: Movie[]) => list.filter((m, i) => list.findIndex((x) => x.id === m.id) === i);
        incoming = { suggestions: uniq(sug.found), watched: uniq(wat.found).map((m) => ({ ...m, watchedAt: now })) };
        missing = [...sug.missing, ...wat.missing];
      }
      setImporting(null);
      if (!incoming.suggestions.length && !incoming.watched.length) throw new Error("Nenhum filme do arquivo foi encontrado.");
      const hasCurrent = state.suggestions.length > 0 || state.watched.length > 0;
      const replace =
        hasCurrent &&
        !window.confirm(
          `Importar ${incoming.suggestions.length} sugestões e ${incoming.watched.length} assistidos.\n\nOK = juntar com a lista atual\nCancelar = substituir a lista atual`,
        );
      setState((s) => (replace || !hasCurrent ? incoming : mergeState(s, incoming)));
      const miss = missing.length ? ` Não encontrei: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}.` : "";
      setNotice({ kind: missing.length ? "error" : "ok", text: `Importado: ${incoming.suggestions.length} sugestões, ${incoming.watched.length} assistidos.${miss}` });
    } catch (err) {
      setImporting(null);
      setNotice({ kind: "error", text: (err as Error).message });
    }
  }

  function spin() {
    if (spinning || suggestions.length === 0) return;
    setPicked(null);
    const idx = randomIndex(suggestions.length);
    setPendingId(suggestions[idx].id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = targetRotation(idx, suggestions.length, rotation, reduce ? 0 : 5);
    if (reduce) {
      setRotation(next);
      setPicked(suggestions[idx]);
      return;
    }
    setSpinning(true);
    setRotation(next);
  }

  function onSpinEnd() {
    setSpinning(false);
    const m = suggestions.find((x) => x.id === pendingId) ?? null;
    setPicked(m);
  }

  return (
    <main className="container">
      <header className="hero">
        <h1>
          Qual filme <span className="accent">vamo ver</span> hoje?
        </h1>
        <p className="muted">Cada um sugere um filme, a roleta decide. Sem briga.</p>
      </header>

      <SearchBar onAdd={addMovie} isAdded={isAdded} />

      <section className="layout">
        <div className="wheel-col">
          <Wheel movies={suggestions} rotation={rotation} spinning={spinning} onSpinEnd={onSpinEnd} />
          <button className="btn primary big" onClick={spin} disabled={spinning || suggestions.length === 0}>
            {spinning ? "Girando…" : suggestions.length === 0 ? "Adicione filmes para girar" : "🎲 Girar a roleta"}
          </button>
        </div>

        <div className="list-col">
          <div className="list-head">
            <h2>Sugestões <span className="count">{suggestions.length}</span></h2>
            <div className="list-tools">
              <button className="btn ghost small" onClick={() => fileRef.current?.click()} disabled={spinning || importing !== null}>⬆ Importar</button>
              <button className="btn ghost small" onClick={exportList} disabled={suggestions.length === 0 && watched.length === 0}>⬇ Exportar</button>
              {(suggestions.length > 0 || watched.length > 0) && (
                <button className="btn ghost small" onClick={clearAll} disabled={spinning}>Limpar tudo</button>
              )}
              <input ref={fileRef} type="file" accept=".txt,text/plain,.json,application/json" hidden onChange={importList} />
            </div>
          </div>
          {importing && <p className="notice ok" role="status">{importing}</p>}
          {notice && !importing && (
            <p className={`notice ${notice.kind}`} role="status">
              {notice.text}
              <button className="notice-close" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button>
            </p>
          )}

          {suggestions.length === 0 ? (
            <p className="empty">Nenhuma sugestão ainda. Use a busca acima para adicionar filmes. 🍿</p>
          ) : (
            <ul className="movie-list">
              {suggestions.map((m) => (
                <li key={m.id}>
                  <MovieCard movie={m}>
                    <div className="actions">
                      <button className="btn small" onClick={() => markWatched(m)} disabled={spinning}>✓ Já assisti</button>
                      <button className="btn ghost small" onClick={() => removeMovie(m.id)} disabled={spinning} aria-label={`Remover ${m.title}`}>Remover</button>
                    </div>
                  </MovieCard>
                </li>
              ))}
            </ul>
          )}

          {watched.length > 0 && (
            <details className="watched" open={showWatched} onToggle={(e) => setShowWatched((e.target as HTMLDetailsElement).open)}>
              <summary>Já assistidos ({watched.length})</summary>
              <ul>
                {watched.map((m) => (
                  <li key={m.id}>
                    <span>
                      {m.title} {m.year && <span className="muted">({m.year})</span>}
                    </span>
                    <button className="btn ghost small" onClick={() => restore(m.id)}>Voltar para a lista</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      <dialog ref={dialogRef} className="result" onClose={() => setPicked(null)}>
        {picked && (
          <div className="result-body">
            <p className="eyebrow">Hoje é dia de…</p>
            <div className="result-main">
              {posterUrl(picked.posterPath, "w342") ? (
                <img src={posterUrl(picked.posterPath, "w342")!} alt={`Pôster de ${picked.title}`} />
              ) : (
                <div className="poster-ph big" aria-hidden>🎬</div>
              )}
              <div>
                <h2>
                  {picked.title} {picked.year && <span className="muted">({picked.year})</span>}
                </h2>
                {picked.rating !== null && <span className="badge">★ {picked.rating.toFixed(1)} no TMDB</span>}
                {picked.overview && <p className="overview">{picked.overview}</p>}
                <p className="links">
                  {picked.imdbId && (
                    <a href={`https://www.imdb.com/title/${picked.imdbId}/`} target="_blank" rel="noopener noreferrer">Ver no IMDb ↗</a>
                  )}
                  <a href={`https://www.themoviedb.org/movie/${picked.id}`} target="_blank" rel="noopener noreferrer">Ver no TMDB ↗</a>
                </p>
              </div>
            </div>
            <div className="result-actions">
              <button className="btn primary" onClick={() => { markWatched(picked); setPicked(null); }}>
                ✓ Vamos ver! (tirar da roleta)
              </button>
              <button className="btn" onClick={() => { setPicked(null); setTimeout(spin, 50); }}>Girar de novo</button>
              <button className="btn ghost" onClick={() => setPicked(null)}>Fechar</button>
            </div>
          </div>
        )}
      </dialog>

      <footer className="footer">
        <p>
          Dados e imagens de filmes fornecidos pelo{" "}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a>. Este produto usa a API do TMDB, mas não é
          endossado nem certificado pelo TMDB. Links para o IMDb são apenas referências externas.
        </p>
        <p>Nada fica guardado no servidor: a lista vive só neste navegador. Use Exportar para salvar a lista em .txt e Importar para trazê-la de volta, em qualquer aparelho.</p>
        <p className="credit">
          Feito com 🍿 por{" "}
          <a href={AUTHOR_URL} target="_blank" rel="noopener author">{AUTHOR_NAME}</a>
        </p>
      </footer>
    </main>
  );
}
