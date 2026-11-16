"use client";
import { useEffect, useRef, useState } from "react";
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { authConfigured, authError, firebaseAuth } from "../lib/firebase-client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!authConfigured);
  const [busy, setBusy] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!authConfigured) return;
    let unsubscribe = () => {};
    try {
      const checkAccess = async (nextUser: User | null, background = false) => {
        const version = ++sequence.current;
        pending.current?.abort();
        const controller = new AbortController();
        pending.current = controller;
        setUser(nextUser);
        if (!background || !nextUser) {
          setCanGenerate(false);
          setAllowed(false);
          setReady(!nextUser);
        }
        setMessage("");
        if (!nextUser) return;
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const token = await nextUser.getIdToken();
          if (version !== sequence.current) return;
          const response = await fetch("/api/auth/access", {
            method: "POST", headers: { Authorization: `Bearer ${token}` },
            cache: "no-store", signal: controller.signal,
          });
          if (response.status === 403) {
            if (version === sequence.current) {
              setAllowed(false); setCanGenerate(false);
              setMessage("Sua conta não possui acesso autorizado. Solicite a liberação ao administrador.");
            }
            return;
          }
          if (!response.ok) throw new Error("access/unavailable");
          const access = await response.json();
          if (version === sequence.current) {
            setAllowed(access.allowed === true);
            setCanGenerate(access.allowed === true && access.canGenerate === true);
          }
        } catch {
          if (version === sequence.current) {
            setAllowed(false); setCanGenerate(false);
            setMessage("Não foi possível verificar sua autorização. O acesso permanece bloqueado. Confira a conexão e entre novamente.");
          }
        } finally {
          clearTimeout(timeout);
          if (version === sequence.current) setReady(true);
        }
      };
      const refresh = () => { if (document.visibilityState === "visible") void checkAccess(firebaseAuth().currentUser, true); };
      const offline = () => {
        ++sequence.current; pending.current?.abort();
        setAllowed(false); setCanGenerate(false); setReady(true);
        setMessage("Conecte-se à internet para verificar seu acesso à aplicação.");
      };
      const stop = onIdTokenChanged(firebaseAuth(), checkAccess, () => {
        ++sequence.current;
        pending.current?.abort();
        setUser(null); setCanGenerate(false); setAllowed(false); setReady(true);
        setMessage("Não foi possível restaurar o login. Entre novamente.");
      });
      const timer = setInterval(refresh, 60000);
      window.addEventListener("online", refresh);
      window.addEventListener("offline", offline);
      document.addEventListener("visibilitychange", refresh);
      unsubscribe = () => {
        stop(); clearInterval(timer);
        window.removeEventListener("online", refresh);
        window.removeEventListener("offline", offline);
        document.removeEventListener("visibilitychange", refresh);
      };
    } catch (error) { setMessage(authError(error)); setReady(true); }
    return () => { ++sequence.current; pending.current?.abort(); unsubscribe(); };
  }, []);

  async function login(email: string, password: string) {
    if (!authConfigured || busy) return;
    setBusy(true); setMessage("");
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
    } catch (error) { setMessage(authError(error)); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (busy) return;
    ++sequence.current; pending.current?.abort(); setCanGenerate(false); setAllowed(false); setReady(true);
    setBusy(true); setMessage("");
    try { await signOut(firebaseAuth()); setUser(null); }
    catch (error) { setMessage(authError(error)); }
    finally { setBusy(false); }
  }
  return { user, ready, busy, allowed, canGenerate, message, configured: authConfigured, login, logout };
}
export type AuthState = ReturnType<typeof useAuth>;
