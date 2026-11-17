"use client";
import { useState, type FormEvent } from "react";
import type { AuthState } from "../hooks/use-auth";
import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from "lucide-react";

export function AuthAccount({ auth }: { auth: AuthState }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const enteredPassword = password;
    setPassword("");
    await auth.login(email, enteredPassword);
  }
  return <section className="panel auth-account" aria-label="Sua conta">
    {!auth.allowed && <div className="auth-welcome"><span className="auth-symbol"><BookOpen size={26} /></span><span className="eyebrow">SEU PRÓXIMO PASSO COMEÇA AQUI</span><h1>Conhecimento que<br />cresce com você.</h1><p>Estude com profundidade, pratique no seu ritmo e transforme cada descoberta em aprendizado.</p><div className="auth-benefits"><span><BookOpen size={17} /> Conteúdo para aprofundar</span><span><Sparkles size={17} /> Prática para evoluir</span></div><span className="auth-access-note"><ShieldCheck size={16} /> Um espaço exclusivo para alunos autorizados</span></div>}
    <div className="auth-form-content">
    <h2>{auth.allowed ? "Sua conta" : "Acesso restrito"}</h2>
    {!auth.configured ? <p>O acesso está aguardando configuração pelo administrador.</p>
      : !auth.ready ? <p role="status">Verificando sua autorização…</p>
      : auth.user ? <>
        <p>Conectado como {auth.user.displayName || auth.user.email || "usuário"}.</p>
        <p className="muted">{auth.user.email}</p>
        {!auth.allowed && <p>Saia da conta e entre com e-mail e senha.</p>}
        <p className="small-text">Identificador da conta (UID): <code>{auth.user.uid}</code></p>
        {auth.canGenerate && <p className="tag">Administrador · geração habilitada</p>}
        <button className="button button-outline" disabled={auth.busy} onClick={() => void auth.logout()}>Sair da conta</button>
      </> : <form onSubmit={(event) => void submit(event)}>
        <p>Entre com o e-mail e a senha cadastrados.</p>
        <label className="field-label">E-mail
          <input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={auth.busy} />
        </label>
        <label className="field-label">Senha
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={auth.busy} />
        </label>
        <button className="button button-primary auth-submit" disabled={auth.busy} type="submit">{auth.busy ? "Entrando…" : "Entrar"}<ArrowRight size={18} aria-hidden="true" /></button>
        <p className="muted">Para obter ou recuperar seu acesso, fale com o administrador.</p>
      </form>}
    {auth.allowed && <p className="muted">O progresso desta conta fica separado no navegador. Entrar com outra conta não exibe estes estudos; use backup para transferir dados conscientemente.</p>}
    {auth.message && <p role="alert" className="inline-message warning">{auth.message}</p>}
    </div>
  </section>;
}
