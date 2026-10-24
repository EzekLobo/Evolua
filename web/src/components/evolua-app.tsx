"use client";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Flame,
  House,
  Layers,
  LayoutGrid,
  Menu,
  RotateCcw,
  Settings2,
  Sprout,
  Target,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { isDue, streak } from "../lib/learning-engine";
import type { Source } from "../lib/content-schema";
import { useProgress } from "../hooks/use-progress";
import {
  Awards,
  Dashboard,
  Trails,
  type SessionConfig,
  type View,
} from "./dashboard";
import { Library } from "./library";
import { Profile } from "./profile";
import { SessionPicker, StudySession } from "./study-session";
import { Logo, ProgressBar, SourceModal } from "./ui";
const navigation = [
  { view: "inicio", label: "Visão geral", icon: House },
  { view: "trilhas", label: "Minhas trilhas", icon: LayoutGrid },
  { view: "cards", label: "Flashcards", icon: Layers },
  { view: "quiz", label: "Quizzes", icon: Target },
  { view: "revisao", label: "Revisão", icon: RotateCcw },
  { view: "biblioteca", label: "Biblioteca", icon: BookOpen },
  { view: "conquistas", label: "Conquistas", icon: Trophy },
] as const;
export function EvoluaApp() {
  const { progress, update, ready, warning } = useProgress();
  const [view, setView] = useState<View>("inicio"),
    [menu, setMenu] = useState(false),
    [session, setSession] = useState<SessionConfig | null>(null),
    [source, setSource] = useState<Source | null>(null),
    [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => {
      const hash = location.hash.slice(1);
      if ([...navigation.map((n) => n.view), "perfil"].includes(hash)) {
        setView(hash as View);
      } else setView("inicio");
      setSession(null);
      setMenu(false);
    };
    sync();
    const connectivity = () => setOnline(navigator.onLine);
    connectivity();
    window.addEventListener("hashchange", sync);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async () => {
          const registration = await navigator.serviceWorker.ready;
          const urls = performance
            .getEntriesByType("resource")
            .map((entry) => new URL(entry.name, location.origin))
            .filter(
              (url) =>
                url.origin === location.origin &&
                url.pathname.startsWith("/_next/static/"),
            )
            .map((url) => url.href);
          registration.active?.postMessage({
            type: "PRECACHE",
            urls: Array.from(new Set(urls)).slice(0, 64),
          });
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
    };
  }, []);
  function navigate(target: View) {
    setSession(null);
    setMenu(false);
    setView(target);
    location.hash = target;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function start(config: SessionConfig) {
    setSession(config);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const due = Object.keys(progress.items).filter((id) =>
    isDue(progress, id),
  ).length;
  const currentLabel =
    view === "perfil"
      ? "Meu perfil"
      : navigation.find((n) => n.view === view)?.label;
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand-link"
          href="#inicio"
          onClick={() => navigate("inicio")}
          aria-label="Evolua — início"
        >
          <Logo />
        </a>
        <p className="brand-subtitle">Aprendizado em movimento</p>
        <span className="nav-caption">SEU ESPAÇO</span>
        <nav aria-label="Menu principal">
          {navigation.map(({ view: target, label, icon: Icon }) => (
            <a
              key={target}
              href={`#${target}`}
              onClick={() => {
                setSession(null);
                setMenu(false);
                setView(target);
              }}
              className={`nav-link ${view === target ? "active" : ""}`}
              aria-current={view === target ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {target === "revisao" && due > 0 ? (
                <span className="nav-count">{due}</span>
              ) : view === target ? (
                <span className="nav-dot" />
              ) : null}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="level-card">
            <span className="level-icon">
              <Sprout size={23} />
            </span>
            <span className="eyebrow">CRESCENDO A CADA DIA</span>
            <h3>
              Nível {Math.floor(progress.xp / 200) + 1} <span>Explorador</span>
            </h3>
            <ProgressBar
              value={(progress.xp % 200) / 2}
              label="Progresso do nível"
            />
            <p>{progress.xp % 200} / 200 XP para o próximo nível</p>
          </div>
          <a
            href="#perfil"
            onClick={() => navigate("perfil")}
            className={`nav-link ${view === "perfil" ? "active" : ""}`}
          >
            <Settings2 size={18} />
            <span>Meu perfil</span>
          </a>
          <div className="sidebar-signature">
            <span className="status-dot" /> Um passo melhor, todos os dias.
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Menu size={23} />
            </button>
            <span className="desktop-only">Meu aprendizado</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{currentLabel}</strong>
          </div>
          <div className="topbar-actions">
            <span className="top-stat streak">
              <Flame size={17} />
              {streak(progress)}
              <span className="desktop-only"> dias</span>
            </span>
            <span className="top-stat xp">
              <Zap size={16} />
              {progress.xp} XP
            </span>
            <button
              className="avatar"
              aria-label="Abrir meu perfil"
              onClick={() => navigate("perfil")}
            >
              {progress.name ? (
                progress.name.slice(0, 2).toUpperCase()
              ) : (
                <UserRound size={19} />
              )}
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {!online && (
            <div className="inline-message">
              Você está offline. As atividades disponíveis continuam salvando
              seu progresso neste navegador.
            </div>
          )}
          {warning && (
            <div className="inline-message warning" role="alert">
              {warning}
            </div>
          )}
          {!ready ? (
            <div className="loading">
              <Logo />
              <p>Preparando sua próxima conquista…</p>
            </div>
          ) : session ? (
            <StudySession
              key={JSON.stringify(session)}
              config={session}
              progress={progress}
              update={update}
              onClose={() => setSession(null)}
              onSource={setSource}
            />
          ) : view === "inicio" ? (
            <Dashboard progress={progress} navigate={navigate} start={start} />
          ) : view === "trilhas" ? (
            <Trails progress={progress} start={start} />
          ) : view === "cards" || view === "quiz" || view === "revisao" ? (
            <SessionPicker
              key={view}
              kind={
                view === "cards" ? "card" : view === "quiz" ? "quiz" : "review"
              }
              progress={progress}
              start={start}
            />
          ) : view === "biblioteca" ? (
            <Library progress={progress} update={update} onSource={setSource} />
          ) : view === "conquistas" ? (
            <Awards progress={progress} />
          ) : (
            <Profile progress={progress} update={update} />
          )}
        </main>
        <footer className="app-footer">
          <span>Feito para mentes curiosas.</span>
          <span>
            Evolua <span className="footer-dot">✦</span> Seu conhecimento, seu
            ritmo.
          </span>
        </footer>
      </div>
      <SourceModal source={source} onClose={() => setSource(null)} />
    </div>
  );
}
