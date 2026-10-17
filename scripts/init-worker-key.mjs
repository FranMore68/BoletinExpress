import { createHmac } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const path = ".secrets/worker.env";
try {
  await readFile(path);
  console.log("Se conserva la clave del worker.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  const file = await readFile(".secrets/supabase.env", "utf8");
  const secret = file
    .split("\n")
    .find((l) => l.startsWith("JWT_SECRET="))
    .slice(11);
  const now = Math.floor(Date.now() / 1000);
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ iss: "supabase", role: "boletin_worker", iat: now, exp: now + 31536000 })}`;
  const key = `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
  await writeFile(
    path,
    `WORKER_REST_URL=http://rest:3000\nWORKER_STORAGE_URL=http://storage:5000\nWORKER_KEY=${key}\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log("Clave exclusiva del worker creada sin mostrar valores.");
}
