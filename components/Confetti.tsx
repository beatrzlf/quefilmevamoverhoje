"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#a78bfa", "#f472b6", "#facc15", "#34d399", "#60a5fa", "#fb923c"];
const COUNT = 140;
const DURATION_MS = 3200;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
  color: string;
};

/**
 * Chuva de confetti em tela cheia. Dispara sempre que `trigger` muda para um
 * valor não nulo. Não faz nada quando o usuário prefere movimento reduzido.
 */
export default function Confetti({ trigger }: { trigger: string | number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (trigger === null || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dois jatos saindo dos cantos inferiores, mirando o centro da tela.
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.6;
      const speed = 11 + Math.random() * 9;
      return {
        x: fromLeft ? 0 : W,
        y: H * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const fade = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.6) / (DURATION_MS * 0.4));
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = fade;
      for (const p of pieces) {
        p.vy += 0.35;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        // Achata no eixo Y para simular o papel girando.
        ctx.scale(1, Math.cos(p.rot * 2));
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);
    };
  }, [trigger]);

  return <canvas ref={canvasRef} className="confetti" aria-hidden />;
}
