"use client";

import { useEffect, useRef, useState } from "react";
import { providerUrl } from "@/lib/providerLinks";
import { emptyProviders, logoUrl, type Provider, type WatchProviders as WP } from "@/lib/providers";

// Cache na memória da aba: a disponibilidade muda com o tempo, então não vai para o localStorage.
const cache = new Map<number, Promise<WP>>();
const queue: (() => void)[] = [];
let active = 0;
const MAX_PARALLEL = 4;

function runQueued<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      task()
        .then(resolve, reject)
        .finally(() => {
          active--;
          queue.shift()?.();
        });
    };
    if (active < MAX_PARALLEL) run();
    else queue.push(run);
  });
}

function fetchProviders(id: number): Promise<WP> {
  let p = cache.get(id);
  if (!p) {
    p = runQueued(async () => {
      const res = await fetch(`/api/movie/${id}/providers`);
      if (!res.ok) throw new Error(String(res.status));
      return ((await res.json()) as { providers: WP }).providers ?? emptyProviders;
    });
    p.catch(() => cache.delete(id)); // tenta de novo numa próxima vez
    cache.set(id, p);
  }
  return p;
}

type Status = { kind: "idle" | "loading" | "error" } | { kind: "ok"; data: WP };

function useProviders(id: number, enabled: boolean): Status {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setStatus({ kind: "loading" });
    fetchProviders(id).then(
      (data) => alive && setStatus({ kind: "ok", data }),
      () => alive && setStatus({ kind: "error" }),
    );
    return () => {
      alive = false;
    };
  }, [id, enabled]);
  return status;
}

function Logos({ list, size, title, fallback }: { list: Provider[]; size: "small" | "big"; title: string; fallback: string | null }) {
  return (
    <ul className={`providers-logos ${size}`}>
      {list.map((p) => {
        const img = <img src={logoUrl(p.logoPath, size === "big" ? "w92" : "w45")} alt={p.name} loading="lazy" />;
        const href = providerUrl(p.name, title, fallback);
        return (
          <li key={p.id} title={href ? `Procurar no ${p.name}` : p.name}>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Procurar ${title} no ${p.name}`}>{img}</a>
            ) : (
              img
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function JustWatchCredit() {
  return (
    <span className="jw-credit">
      Disponibilidade no Brasil por{" "}
      <a href="https://www.justwatch.com/br" target="_blank" rel="noopener noreferrer">JustWatch</a>
    </span>
  );
}

/** Versão compacta para a lista: só os logos de streaming, carregados quando o card aparece na tela. */
export function ProvidersInline({ movieId, title }: { movieId: number; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const status = useProviders(movieId, visible);
  let content: React.ReactNode = null;
  if (status.kind === "ok") {
    const { streaming, rent, buy, link } = status.data;
    if (streaming.length) {
      content = (
        <>
          <span className="sr-only">Disponível em: </span>
          <Logos list={streaming.slice(0, 6)} size="small" title={title} fallback={link} />
          {streaming.length > 6 && <span className="providers-more">+{streaming.length - 6}</span>}
        </>
      );
    } else if (rent.length || buy.length) {
      content = <span className="providers-note">Só para alugar ou comprar</span>;
    } else {
      content = <span className="providers-note">Fora dos streamings no Brasil</span>;
    }
  }
  return (
    <div ref={ref} className="providers-inline" aria-live="polite">
      {content}
    </div>
  );
}

/** Versão completa para o filme sorteado: assinatura, aluguel e compra. */
export function ProvidersFull({ movieId, title }: { movieId: number; title: string }) {
  const status = useProviders(movieId, true);
  return (
    <section className="providers-full" aria-label="Onde assistir">
      <h3>Onde assistir</h3>
      {(status.kind === "loading" || status.kind === "idle") && <p className="providers-note">Procurando nos streamings…</p>}
      {status.kind === "error" && <p className="providers-note">Não consegui ver os streamings agora.</p>}
      {status.kind === "ok" && (() => {
        const { streaming, rent, buy, link } = status.data;
        if (!streaming.length && !rent.length && !buy.length) {
          return <p className="providers-note">Este filme não está em nenhum streaming no Brasil no momento.</p>;
        }
        return (
          <>
            {streaming.length > 0 && (
              <div className="providers-group"><span>Na assinatura</span><Logos list={streaming} size="big" title={title} fallback={link} /></div>
            )}
            {rent.length > 0 && (
              <div className="providers-group"><span>Alugar</span><Logos list={rent} size="big" title={title} fallback={link} /></div>
            )}
            {buy.length > 0 && (
              <div className="providers-group"><span>Comprar</span><Logos list={buy} size="big" title={title} fallback={link} /></div>
            )}
            {link && (
              <a className="providers-link" href={link} target="_blank" rel="noopener noreferrer">Ver todas as opções no TMDB ↗</a>
            )}
          </>
        );
      })()}
      <JustWatchCredit />
    </section>
  );
}
