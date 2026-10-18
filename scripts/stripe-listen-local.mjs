import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const name = "boletinexpress-stripe-listener";
const envPath = ".secrets/stripe.env";
const statePath = ".secrets/stripe-listener-state.json";
const mode = process.argv[2];
if (!["start", "stop"].includes(mode))
  throw Error("Uso: node scripts/stripe-listen-local.mjs start|stop");
const original = await readFile(envPath, "utf8");
const values = Object.fromEntries(
  original
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const key = values.STRIPE_SECRET_KEY;
const hash = (s) => createHash("sha256").update(s).digest("hex");
const base = ["compose", "-f", "compose.yaml", "-f", "compose.auth.yaml"];
const local = [...base, "-f", "compose.stripe-local.yaml"];
const replaceSecret = (text, value) =>
  `${text
    .split("\n")
    .filter((l) => !l.startsWith("STRIPE_WEBHOOK_SECRET="))
    .join("\n")
    .trimEnd()}\nSTRIPE_WEBHOOK_SECRET=${value}\n`;
async function inspect() {
  try {
    return JSON.parse((await run("docker", ["inspect", name])).stdout)[0];
  } catch {
    return null;
  }
}
function managed(container) {
  return (
    container?.Config?.Labels?.["com.docker.compose.project"] ===
      "boletinexpress-evaluation" &&
    container?.Config?.Labels?.["com.docker.compose.service"] ===
      "stripe-listener"
  );
}
if (mode === "stop") {
  const container = await inspect();
  if (container && !managed(container))
    throw Error("El nombre pertenece a otro contenedor; se conserva.");
  if (container) await run("docker", ["rm", "--force", name]);
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    if (hash(values.STRIPE_WEBHOOK_SECRET || "") === state.secretHash)
      await writeFile(envPath, replaceSecret(original, ""), { mode: 0o600 });
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  await run("docker", [
    ...base,
    "up",
    "--detach",
    "--wait",
    "--no-deps",
    "web",
  ]);
  console.log("Listener detenido; configuración web habitual restaurada.");
  process.exit(0);
}
if (!/^sk_test_[A-Za-z0-9]+$/.test(key || ""))
  throw Error("Falta la clave secreta de pruebas.");
if (await inspect())
  throw Error("Ya existe el listener; usa stop antes de volver a iniciarlo.");
await writeFile(".secrets/stripe-cli.env", `STRIPE_API_KEY=${key}\n`, {
  mode: 0o600,
});
const child = spawn(
  "docker",
  [
    ...local,
    "run",
    "--rm",
    "--no-deps",
    "-T",
    "--name",
    name,
    "stripe-listener",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let captured = "";
try {
  const secret = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Tiempo de espera del listener agotado.")),
      45000,
    );
    const collect = (chunk) => {
      captured = (captured + chunk.toString()).slice(-16384);
      const match = /whsec_[A-Za-z0-9_]+/.exec(captured);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", () => {
      clearTimeout(timer);
      reject(Error("No se pudo iniciar Docker."));
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(Error("Stripe CLI terminó antes de estar preparado."));
    });
  });
  await writeFile(
    envPath,
    replaceSecret(await readFile(envPath, "utf8"), secret),
    { mode: 0o600 },
  );
  await writeFile(
    statePath,
    JSON.stringify(
      {
        secretHash: hash(secret),
        startedAt: new Date().toISOString(),
        image: "boletinexpress-stripe-cli:1.54.0-be1",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await run("docker", [
    ...local,
    "up",
    "--detach",
    "--wait",
    "--no-deps",
    "web",
  ]);
  // Detach this client only. SIGKILL cannot be forwarded by the Docker client;
  // the managed listener stays in the daemon, with its log driver disabled.
  child.kill("SIGKILL");
  await new Promise((resolve) => child.once("exit", resolve));
  const container = await inspect();
  if (!managed(container) || !container.State.Running)
    throw Error("El listener no permanece activo.");
  console.log(
    "Listener Stripe activo. Secreto guardado sin mostrarlo; web preparada para Checkout en pruebas.",
  );
} catch {
  child.kill("SIGKILL");
  const container = await inspect();
  if (managed(container)) await run("docker", ["rm", "--force", name]);
  const current = await readFile(envPath, "utf8");
  await writeFile(
    envPath,
    replaceSecret(current, values.STRIPE_WEBHOOK_SECRET || ""),
    { mode: 0o600 },
  );
  await run("docker", [
    ...base,
    "up",
    "--detach",
    "--wait",
    "--no-deps",
    "web",
  ]);
  throw Error(
    "No se ha podido preparar el listener. No se muestran claves ni su salida privada.",
  );
}
