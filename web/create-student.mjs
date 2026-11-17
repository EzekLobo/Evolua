import { randomBytes } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2]?.trim();
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!email || !projectId || !clientEmail || !privateKey) {
  console.error("Informe o e-mail e configure as credenciais do Firebase Admin.");
  process.exit(1);
}

const auth = getAuth(initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }));
const password = randomBytes(24).toString("base64url");
let uid;
try {
  const user = await auth.createUser({ email, password, disabled: true });
  uid = user.uid;
  await auth.setCustomUserClaims(uid, { evoluaStudent: true });
  await auth.updateUser(uid, { disabled: false });
  console.log(`Conta criada e liberada. E-mail: ${email}\nSenha: ${password}`);
} catch (error) {
  console.error("Cadastro não concluído:", error.code ?? "erro desconhecido");
  if (uid) console.error(`Confira a conta ${uid} no console do Firebase antes de tentar novamente.`);
  process.exitCode = 1;
}
