import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./study-session.css";
export const metadata: Metadata = {
  title: "Evolua — Seu próximo nível começa aqui",
  description:
    "Aprenda um pouco. Evolua muito. Trilhas de estudo, flashcards, quizzes e desafios para transformar conhecimento em conquista.",
  applicationName: "Evolua",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Evolua", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  themeColor: "#174e40",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
