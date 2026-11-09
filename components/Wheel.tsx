"use client";

import type { Movie } from "@/lib/types";

const COLORS = ["#ff5e5b", "#ffb400", "#00b4d8", "#7b2cbf", "#2ec4b6", "#f15bb5", "#ff8c42", "#4361ee"];
const R = 150;

function slicePath(i: number, n: number) {
  const a0 = ((i / n) * 360 - 90) * (Math.PI / 180);
  const a1 = (((i + 1) / n) * 360 - 90) * (Math.PI / 180);
  const x0 = R + R * Math.cos(a0), y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1), y1 = R + R * Math.sin(a1);
  const large = 360 / n > 180 ? 1 : 0;
  return `M${R},${R} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
}

function short(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

/** Quebra o título em até `lines` linhas de no máximo `max` caracteres, por palavra. */
export function wrapTitle(title: string, max: number, lines: number): string[] {
  const words = title.trim().split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < words.length && out.length < lines) {
    const last = out.length === lines - 1;
    if (last) {
      out.push(short(words.slice(i).join(" "), max));
      break;
    }
    let cur = words[i++];
    while (i < words.length && `${cur} ${words[i]}`.length <= max) cur += ` ${words[i++]}`;
    out.push(short(cur, max));
  }
  return out;
}

interface Props {
  movies: Movie[];
  rotation: number;
  spinning: boolean;
  onSpinEnd: () => void;
}

export default function Wheel({ movies, rotation, spinning, onSpinEnd }: Props) {
  const n = movies.length;
  const fontSize = n > 20 ? 8 : n > 12 ? 10 : n > 6 ? 11 : 13;
  // Espaço útil do raio (do miolo até perto da borda) dividido pela largura média de um caractere.
  const maxChars = Math.floor((R - 30) / (fontSize * 0.58));
  // Com poucas fatias há altura para duas linhas.
  const maxLines = n <= 8 ? 2 : 1;
  const lineH = fontSize * 1.1;

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden />
      <svg
        className="wheel"
        viewBox={`0 0 ${R * 2} ${R * 2}`}
        role="img"
        aria-label={n ? `Roleta com ${n} filmes` : "Roleta vazia"}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 1)" : "none",
        }}
        onTransitionEnd={onSpinEnd}
      >
        {n === 0 && <circle cx={R} cy={R} r={R} fill="var(--surface-2)" />}
        {n === 1 && <circle cx={R} cy={R} r={R} fill={COLORS[0]} />}
        {n > 1 &&
          movies.map((m, i) => (
            <path key={m.id} d={slicePath(i, n)} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,.25)" strokeWidth={1} />
          ))}
        {n > 0 &&
          n <= 40 &&
          movies.map((m, i) => {
            const angle = n === 1 ? 0 : ((i + 0.5) / n) * 360 - 90;
            // Na metade esquerda o texto é girado 180° para não ficar de cabeça para baixo.
            const flip = n > 1 && angle > 90 && angle < 270;
            const lines = wrapTitle(m.title, maxChars, maxLines);
            const x = flip ? R - 24 : R + 24;
            const y0 = R - ((lines.length - 1) * lineH) / 2;
            return (
              <text
                key={`t${m.id}`}
                transform={`rotate(${flip ? angle + 180 : angle} ${R} ${R})`}
                fontSize={fontSize}
                fill="#fff"
                fontWeight={700}
                textAnchor={flip ? "end" : "start"}
                dominantBaseline="middle"
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.25)", strokeWidth: 2 }}
              >
                <title>{m.title}</title>
                {lines.map((l, k) => (
                  <tspan key={k} x={x} y={y0 + k * lineH}>
                    {l}
                  </tspan>
                ))}
              </text>
            );
          })}
        <circle cx={R} cy={R} r={16} fill="var(--bg)" stroke="#fff" strokeWidth={3} />
      </svg>
    </div>
  );
}
