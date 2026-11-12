import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: roleta de filmes para decidir o que assistir`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = ["#ffb400", "#ff5e5b", "#2ec4b6", "#ffb400", "#ff5e5b", "#2ec4b6"];

export default function OpengraphImage() {
  const r = 190;
  const slices = COLORS.map((c, i) => {
    const a0 = (i / COLORS.length) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / COLORS.length) * Math.PI * 2 - Math.PI / 2;
    const d = `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`;
    return <path key={i} d={d} fill={c} />;
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 90px",
          background: "radial-gradient(900px 500px at 30% 0%, #2b1f4d 0%, #14111f 70%)",
          color: "#f4f1ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ fontSize: 30, color: "#ffb400", fontWeight: 700, letterSpacing: 2 }}>ROLETA DE FILMES</div>
          <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.05, marginTop: 16 }}>Qual filme vamo ver hoje?</div>
          <div style={{ fontSize: 32, color: "#a69fc4", marginTop: 24 }}>Cada um sugere um filme, a roleta decide.</div>
        </div>
        <svg width="400" height="400" viewBox="-200 -200 400 400">
          {slices}
          <circle r="40" fill="#f4f1ff" />
          <circle r="16" fill="#14111f" />
        </svg>
      </div>
    ),
    size,
  );
}
