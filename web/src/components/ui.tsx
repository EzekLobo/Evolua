"use client";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Flame,
  Gem,
  GraduationCap,
  Lightbulb,
  Network,
  Sprout,
  Target,
  Trophy,
  X,
} from "lucide-react";
import type { Source } from "../lib/content-schema";
export const topicIcons = [Lightbulb, Brain, Network, GraduationCap];
export const awardIcons = {
  sprout: Sprout,
  brain: Brain,
  flame: Flame,
  gem: Gem,
  target: Target,
  trophy: Trophy,
};
export function Logo() {
  return (
    <span className="brand">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="currentColor" />
        <path d="M10 29v-8l8-8v16zm13 0V9h7v20z" fill="#c5ed92" />
      </svg>
      <span>
        evolua<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function SourceButton({
  source,
  onSource,
}: {
  source: Source;
  onSource: (s: Source) => void;
}) {
  return (
    <button className="source-button" onClick={() => onSource(source)}>
      <BookOpen size={14} /> Ver fonte · p. {source.page}
      <ArrowUpRight size={13} />
    </button>
  );
}
export function SourceModal({
  source,
  onClose,
}: {
  source: Source | null;
  onClose: () => void;
}) {
  if (!source) return null;
  return (
    <Modal title="De onde vem este conteúdo" onClose={onClose}>
      <div className="source-document">
        <BookOpen size={30} />
        <div>
          <strong>{source.pdf}</strong>
          <p>Página {source.page}</p>
        </div>
      </div>
      <p className="eyebrow">TRECHO DE REFERÊNCIA</p>
      <blockquote>{source.excerpt}</blockquote>
      <p className="muted">
        A referência foi preservada do material de estudo original. O PDF
        completo não é distribuído pela plataforma.
      </p>
    </Modal>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={(node) => node?.focus()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const buttons = e.currentTarget.querySelectorAll<HTMLElement>(
              'button,a,input,select,textarea,[tabindex="0"]',
            );
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Fechar" className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function BotanicalArt() {
  return (
    <svg
      className="botanical-art"
      viewBox="0 0 320 240"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="185" cy="125" r="94" fill="#ffffff" fillOpacity=".055" />
      <circle
        cx="185"
        cy="125"
        r="68"
        stroke="#e0edc4"
        strokeOpacity=".18"
        strokeDasharray="4 8"
      />
      <path
        d="M178 210V83"
        stroke="#c7ec98"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M179 166c-52 0-73-28-73-63 44 0 73 22 73 63Z" fill="#8fba7d" />
      <path d="M180 130c50 0 73-28 73-62-43 0-73 22-73 62Z" fill="#c5ed92" />
      <path
        d="m111 108 62 53m73-87-62 51"
        stroke="#174e40"
        strokeWidth="2"
        strokeOpacity=".5"
      />
      <path d="M145 209h69l-8 22h-53z" fill="#deefcb" />
      <path d="m82 44 4 10 11 4-11 4-4 10-4-10-11-4 11-4z" fill="#c5ed92" />
      <circle cx="273" cy="170" r="5" fill="#c5ed92" />
      <path d="m259 28 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#e1edc4" />
      <rect
        x="65"
        y="155"
        width="66"
        height="37"
        rx="11"
        fill="#f8faf3"
        transform="rotate(-12 65 155)"
      />
      <path
        d="m81 172 8 6 12-17"
        stroke="#174e40"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="226"
        y="102"
        width="61"
        height="36"
        rx="10"
        fill="#e1ecff"
        transform="rotate(12 226 102)"
      />
      <path d="m240 115 7 2-2 7-7-2z" fill="#7f9ac9" />
      <path
        d="m251 119 20 4m-22 3 13 3"
        stroke="#7f9ac9"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
