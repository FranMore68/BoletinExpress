import { createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const target = new URL("../.secrets/coolify.env", import.meta.url);
const dir = new URL("../.secrets/", import.meta.url);
await mkdir(dir, { recursive: true, mode: 0o700 });
const readEnv = async (name) => {
  try {
    const source = await readFile(new URL(name, dir), "utf8");
    return Object.fromEntries(
      source
        .split("\n")
        .filter((s) => /^[A-Z_]+=/.test(s))
        .map((s) => {
          const i = s.indexOf("=");
          let v = s.slice(i + 1).trim();
          if (
            (v.startsWith("'") && v.endsWith("'")) ||
            (v.startsWith('"') && v.endsWith('"'))
          )
            v = v.slice(1, -1);
          return [s.slice(0, i), v];
        }),
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    return {};
  }
};
const mail = await readEnv("mail.env");
const ai = await readEnv("openai.env");
const stripe = await readEnv("stripe.env");
const secret = randomBytes(48).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const token = (role) => {
  const text = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ iss: "supabase", role, iat: now, exp: now + 90 * 86400 })}`;
  return `${text}.${createHmac("sha256", secret).update(text).digest("base64url")}`;
};
const sender = /^(?:[^<>]*<)?([^<>\s]+@[^<>\s]+)>?$/.exec(mail.MAIL_FROM || "");
const values = {
  APP_URL: "https://boletinexpress.moremaker3d.cloud",
  POSTGRES_PASSWORD: randomBytes(24).toString("hex"),
  JWT_SECRET: secret,
  ANON_KEY: token("anon"),
  SERVICE_ROLE_KEY: token("service_role"),
  WORKER_KEY: token("boletin_worker"),
  CREDITS_API_KEY: token("boletin_credits_api"),
  PAYMENTS_API_KEY: token("boletin_payments_api"),
  EXTRACTION_API_KEY: token("boletin_extraction_api"),
  AUTH_PROOF_SECRET: randomBytes(32).toString("hex"),
  MAIL_FROM: sender ? mail.MAIL_FROM : "",
  SMTP_FROM: sender?.[1] || "",
  RESEND_API_KEY: /^re_[A-Za-z0-9_]+$/.test(mail.RESEND_API_KEY || "")
    ? mail.RESEND_API_KEY
    : "",
  OPENAI_API_KEY: /^sk-[A-Za-z0-9_-]+$/.test(ai.OPENAI_API_KEY || "")
    ? ai.OPENAI_API_KEY
    : "",
  STRIPE_SECRET_KEY: /^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(
    stripe.STRIPE_SECRET_KEY || "",
  )
    ? stripe.STRIPE_SECRET_KEY
    : "",
  // El secreto de Stripe CLI local no sirve para el endpoint HTTPS remoto.
  STRIPE_WEBHOOK_SECRET: "",
  ...Object.fromEntries(
    [
      "WEB",
      "WORKER",
      "POSTGRES",
      "AUTH",
      "STORAGE",
      "GATEWAY",
      "TEMPLATES",
    ].map((n) => [`BE_IMAGE_${n}`, ""]),
  ),
};
const quote = (v) => {
  if (/[\r\n'\\]/.test(v))
    throw Error("Valor de entorno no compatible; no se ha escrito el archivo.");
  return `'${v}'`;
};
await writeFile(
  target,
  `${Object.entries(values)
    .map(([k, v]) => `${k}=${quote(v)}`)
    .join("\n")}\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Configuración remota creada en .secrets/coolify.env; no se modifica la local ni se muestran valores.",
);
console.log(
  `Pendientes: ${Object.entries(values)
    .filter(([, v]) => !v)
    .map(([k]) => k)
    .join(", ")}`,
);
