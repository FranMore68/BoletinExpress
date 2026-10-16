import { createHmac, randomBytes } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";

const dir = new URL("../.secrets/", import.meta.url);
await mkdir(dir, { recursive: true, mode: 0o700 });
const target = new URL("supabase.env", dir);
try {
  await access(target);
  throw new Error("Ya existe la configuración local; se conserva.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const secret = randomBytes(48).toString("base64url");
const token = (role) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      iss: "supabase",
      ref: "boletinexpress",
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 31536000,
    }),
  ).toString("base64url");
  return `${header}.${body}.${createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")}`;
};
const anon = token("anon");
const proof = randomBytes(32).toString("hex");
await writeFile(
  target,
  `APP_URL=http://127.0.0.1:3000\nPOSTGRES_PASSWORD=${randomBytes(24).toString("hex")}\nJWT_SECRET=${secret}\nANON_KEY=${anon}\nSERVICE_ROLE_KEY=${token("service_role")}\n`,
  { mode: 0o600 },
);
await writeFile(
  new URL("app.env", dir),
  `APP_URL=http://127.0.0.1:3000\nSUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_ANON_KEY=${anon}\nAUTH_PROOF_SECRET=${proof}\n`,
  { mode: 0o600 },
);
console.log(
  "Credenciales locales generadas en .secrets (excluidas de Git). No se muestran valores.",
);
