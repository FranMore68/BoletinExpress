import { createHmac } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const path = ".secrets/credits.env";
try {
  await readFile(path);
  console.log("Se conserva la credencial restringida de créditos.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  const env = await readFile(".secrets/supabase.env", "utf8");
  const secret = env
    .split("\n")
    .find((l) => l.startsWith("JWT_SECRET="))
    .slice(11);
  const now = Math.floor(Date.now() / 1000);
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ iss: "supabase", role: "boletin_credits_api", iat: now, exp: now + 31536000 })}`;
  const token = `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
  await writeFile(path, `CREDITS_API_KEY=${token}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  console.log("Credencial de créditos creada sin mostrar valores.");
}
