import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const authConfigured = Object.values(config).every(Boolean);

export function firebaseAuth() {
  if (!authConfigured) throw new Error("auth/not-configured");
  const app = getApps().find((item) => item.name === "evolua-web") ??
    initializeApp(config, "evolua-web");
  return getAuth(app);
}

export function authError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(code ?? ""))
    return "E-mail ou senha inválidos. Confira os dados ou fale com o administrador.";
  if (code === "auth/too-many-requests") return "Muitas tentativas. Aguarde um momento antes de tentar novamente.";
  if (code === "auth/user-disabled") return "Esta conta está desativada. Fale com o administrador.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return "Login cancelado. Você pode continuar estudando como visitante.";
  if (code === "auth/popup-blocked")
    return "O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.";
  if (code === "auth/network-request-failed")
    return "Não foi possível conectar ao Google. Confira sua conexão e tente novamente.";
  if (code === "auth/unauthorized-domain")
    return "Este endereço ainda não está autorizado para login. Contate o responsável pela aplicação.";
  return "Não foi possível concluir a autenticação. Tente novamente.";
}
