import { readFile, unlink, writeFile } from "node:fs/promises";

const mode = process.argv[2];
if (!["enable", "disable"].includes(mode))
  throw Error("Uso: node scripts/configure-resend.mjs enable|disable");
const path = ".secrets/mail.env";
const source = await readFile(path, "utf8");
const readEnv = (s) =>
  Object.fromEntries(
    s
      .split("\n")
      .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
const mail = readEnv(source);
const supabasePath = ".secrets/supabase.env";
const supabase = await readFile(supabasePath, "utf8");
const values = readEnv(supabase);
const replace = (text, key, value) => {
  const lines = text.split("\n").filter((l) => !l.startsWith(`${key}=`));
  return `${lines.join("\n").trimEnd()}\n${key}=${value}\n`;
};
const backupPath = ".secrets/resend-mode-backup.json";
if (mode === "enable") {
  if (!/^re_[A-Za-z0-9_]+$/.test(mail.RESEND_API_KEY || ""))
    throw Error("Falta la clave Resend en el archivo privado.");
  const match = /^(?:[^<>]*<)?([^<>\s]+@[^<>\s]+)>?$/.exec(
    mail.MAIL_FROM || "",
  );
  if (!match || /[\r\n]/.test(mail.MAIL_FROM))
    throw Error("Remitente no válido.");
  if (
    (values.SMTP_HOST && values.SMTP_HOST !== "mail") ||
    values.SMTP_USER ||
    values.SMTP_PASS
  )
    throw Error("Ya existe otro SMTP: se conserva y no se modifica.");
  try {
    await writeFile(
      backupPath,
      JSON.stringify({ smtpFrom: values.SMTP_FROM ?? null }, null, 2),
      { mode: 0o600, flag: "wx" },
    );
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  const relay = `${[
    "# SMTP de Auth: direcciones reales hacia Resend; .invalid permanece local.",
    "MP_SMTP_RELAY_HOST=smtp.resend.com",
    "MP_SMTP_RELAY_PORT=465",
    "MP_SMTP_RELAY_TLS=true",
    "MP_SMTP_RELAY_ALLOW_INSECURE=false",
    "MP_SMTP_RELAY_AUTH=plain",
    "MP_SMTP_RELAY_USERNAME=resend",
    `MP_SMTP_RELAY_PASSWORD=${mail.RESEND_API_KEY}`,
    "MP_SMTP_RELAY_ALL=true",
    "MP_SMTP_RELAY_BLOCKED_RECIPIENTS='(?i)@([^@]*\\.)?invalid$'",
    "MP_SMTP_RELAY_FWD_SMTP_ERRORS=true",
    "MP_SMTP_RELAY_PRESERVE_MESSAGE_IDS=true",
  ].join("\n")}\n`;
  await writeFile(".secrets/auth-mail.env", relay, { mode: 0o600 });
  await writeFile(supabasePath, replace(supabase, "SMTP_FROM", match[1]), {
    mode: 0o600,
  });
  await writeFile(path, replace(source, "MAIL_TRANSPORT", "resend"), {
    mode: 0o600,
  });
  console.log(
    "Resend preparado para documentos y SMTP de acceso. Recrear mail, auth y worker; no se muestran claves.",
  );
} else {
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  const restored =
    backup.smtpFrom === null
      ? supabase
          .split("\n")
          .filter((l) => !l.startsWith("SMTP_FROM="))
          .join("\n")
      : replace(supabase, "SMTP_FROM", backup.smtpFrom);
  await writeFile(supabasePath, restored, { mode: 0o600 });
  await writeFile(path, replace(source, "MAIL_TRANSPORT", "mailpit"), {
    mode: 0o600,
  });
  await unlink(".secrets/auth-mail.env").catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
  console.log(
    "Configuración del buzón local restaurada. Recrear mail, auth y worker.",
  );
}
