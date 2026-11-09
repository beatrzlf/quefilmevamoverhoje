"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SearchBar from "@/components/SearchBar";
import Wheel from "@/components/Wheel";
import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/lib/types";
import { emptyState, exportState, loadState, mergeState, MAX_IMPORT_BYTES, parseImport, saveState, type SavedState } from "@/lib/storage";
import { randomIndex, targetRotation } from "@/lib/roulette";
import { posterUrl } from "@/lib/poster";

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

  function exportList() {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roleta-de-filmes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ kind: "ok", text: "Lista exportada. Guarde o arquivo para importar depois." });
  }

  async function importList(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("Arquivo grande demais (máx. 1 MB).");
      const incoming = parseImport(await file.text());
      const hasCurrent = state.suggestions.length > 0 || state.watched.length > 0;
      const replace =
        hasCurrent &&
        !window.confirm(
          `Importar ${incoming.suggestions.length} sugestões e ${incoming.watched.length} assistidos.\n\nOK = juntar com a lista atual\nCancelar = substituir a lista atual`,
        );
      setState((s) => (replace || !hasCurrent ? incoming : mergeState(s, incoming)));
      setNotice({ kind: "ok", text: `Importado: ${incoming.suggestions.length} sugestões, ${incoming.watched.length} assistidos.` });
    } catch (err) {
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
              <button className="btn ghost small" onClick={() => fileRef.current?.click()} disabled={spinning}>⬆ Importar</button>
              <button className="btn ghost small" onClick={exportList} disabled={suggestions.length === 0 && watched.length === 0}>⬇ Exportar</button>
              {(suggestions.length > 0 || watched.length > 0) && (
                <button className="btn ghost small" onClick={clearAll} disabled={spinning}>Limpar tudo</button>
              )}
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importList} />
            </div>
          </div>
          {notice && (
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
        <p>Nada fica guardado no servidor: a lista vive só neste navegador. Use Exportar para levar a lista para outro aparelho ou guardar um backup.</p>
      </footer>
    </main>
  );
}
