import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qual filme vamo ver hoje?",
  description: "Adicione sugestões de filmes, gire a roleta e descubra o que assistir hoje.",
};

export const viewport: Viewport = { themeColor: "#14111f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
