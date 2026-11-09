"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/poster";

interface Props {
  onAdd: (movie: Movie) => void;
  isAdded: (id: number) => boolean;
}

const cache = new Map<string, Movie[]>();

export default function SearchBar({ onAdd, isAdded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Busca com debounce + cancelamento da requisição anterior + cache em memória.
  useEffect(() => {
    const q = query.trim();
    setError(null);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const key = q.toLowerCase();
    const hit = cache.get(key);
    if (hit) {
      setResults(hit);
      setActive(-1);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Erro na busca");
        cache.set(key, data.results);
        setResults(data.results);
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(m: Movie) {
    if (isAdded(m.id)) return;
    onAdd(m);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length >= 2;

  return (
    <div className="search" ref={wrapRef}>
      <label htmlFor="busca" className="sr-only">Buscar filme</label>
      <div className="search-input">
        <svg aria-hidden viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 2a8 8 0 0 1 6.32 12.9l5.39 5.4-1.41 1.4-5.4-5.39A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/></svg>
        <input
          id="busca"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          maxLength={100}
          placeholder="Busque um filme para sugerir…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && <span className="spinner" aria-label="Carregando" />}
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="search-results">
          {error && <li className="search-msg error">{error}</li>}
          {!error && !loading && results.length === 0 && <li className="search-msg">Nenhum filme encontrado.</li>}
          {results.map((m, i) => {
            const added = isAdded(m.id);
            const img = posterUrl(m.posterPath, "w92");
            return (
              <li
                key={m.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={added}
                className={`search-item${i === active ? " active" : ""}${added ? " added" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
              >
                {img ? <img src={img} alt="" width={40} height={60} loading="lazy" /> : <div className="poster-ph small" aria-hidden>🎬</div>}
                <div className="search-text">
                  <strong>{m.title}</strong>
                  <span>
                    {m.year ?? "s/ data"}
                    {m.originalTitle && m.originalTitle !== m.title ? ` · ${m.originalTitle}` : ""}
                  </span>
                </div>
                <span className="search-add">{added ? "Na lista" : "+ Adicionar"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
