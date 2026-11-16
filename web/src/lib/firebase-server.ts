import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export class AuthFailure extends Error {
  constructor(public status: number) { super("Authentication unavailable"); }
}

export async function verifiedIdentity(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/);
  if (!match || match[1].length > 8192) throw new AuthFailure(401);
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) throw new AuthFailure(503);
  try {
    const app = getApps().find((item) => item.name === "evolua-admin") ??
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "evolua-admin");
    return await getAuth(app).verifyIdToken(match[1], true);
  } catch {
    throw new AuthFailure(401);
  }
}

export function isOwner(identity: { uid: string; email_verified?: boolean }) {
  const owner = process.env.FIREBASE_OWNER_UID?.trim();
  return !!owner && identity.uid === owner;
}

export function canAccess(identity: { uid: string; firebase?: { sign_in_provider?: string } }) {
  // The owner is identified by the server-side UID allowlist. The account is
  // created as email/password in Firebase; accepting the owner match first
  // also keeps access stable when Firebase omits the provider claim during a
  // token refresh.
  if (isOwner(identity)) return true;
  if (identity.firebase?.sign_in_provider !== "password") return false;
  const allowed = (process.env.FIREBASE_ALLOWED_UIDS ?? "").split(",").map((uid) => uid.trim()).filter(Boolean);
  return allowed.includes(identity.uid);
}
