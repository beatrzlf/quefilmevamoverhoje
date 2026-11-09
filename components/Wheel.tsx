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
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

interface Props {
  movies: Movie[];
  rotation: number;
  spinning: boolean;
  onSpinEnd: () => void;
}

export default function Wheel({ movies, rotation, spinning, onSpinEnd }: Props) {
  const n = movies.length;
  const maxChars = n > 16 ? 10 : 16;
  const fontSize = n > 20 ? 8 : n > 12 ? 10 : 12;

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
            const angle = ((i + 0.5) / n) * 360 - 90;
            return (
              <text
                key={`t${m.id}`}
                x={R + 18}
                y={R}
                transform={`rotate(${angle} ${R} ${R})`}
                fontSize={fontSize}
                fill="#fff"
                dominantBaseline="middle"
                fontWeight={600}
              >
                {short(m.title, maxChars)}
              </text>
            );
          })}
        <circle cx={R} cy={R} r={16} fill="var(--bg)" stroke="#fff" strokeWidth={3} />
      </svg>
    </div>
  );
}
