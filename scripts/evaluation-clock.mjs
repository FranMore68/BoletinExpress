import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

// Administración local, sin endpoint ni credencial que pueda usar el navegador.
const [action, owner, hours = "0"] = process.argv.slice(2);
if (
  !/^[0-9a-f-]{36}$/.test(owner || "") ||
  !["enroll", "advance", "show"].includes(action)
)
  throw Error(
    "Uso: node scripts/evaluation-clock.mjs enroll|advance|show UUID [horas]",
  );
const env = await readFile(".secrets/app.env", "utf8");
const configured = process.env.APP_ENV || env.match(/^APP_ENV=(.*)$/m)?.[1];
const appUrl = env.match(/^APP_URL=(.*)$/m)?.[1];
if (
  configured !== "evaluation" ||
  !appUrl ||
  !["localhost", "127.0.0.1"].includes(new URL(appUrl).hostname)
)
  throw Error("Solo evaluación local; ejecuta con APP_ENV=evaluation");
const increment = Number(hours);
if (!Number.isSafeInteger(increment) || increment < 0 || increment > 2160)
  throw Error("Horas enteras: 0 a 2160");
const query = `begin;
select owner_id from public.credit_accounts where owner_id='${owner}' for update;
${action === "enroll" ? `insert into private.evaluation_clocks(owner_id) select id from auth.users where id='${owner}' and email like '%@example.invalid' and email_confirmed_at is not null on conflict do nothing;` : ""}
${action === "advance" ? `update private.evaluation_clocks set offset_seconds=offset_seconds+${increment}*3600 where owner_id='${owner}';` : ""}
select json_build_object('owner',owner_id,'offsetSeconds',offset_seconds,'documentTime',private.document_now(owner_id)) from private.evaluation_clocks where owner_id='${owner}';
commit;`;
const child = spawn(
  "docker",
  [
    "compose",
    "--env-file",
    ".secrets/supabase.env",
    "-f",
    "infra/supabase/compose.yaml",
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-qAt",
  ],
  { stdio: ["pipe", "pipe", "inherit"] },
);
let output = "";
child.stdout.on("data", (v) => {
  output += v;
});
child.stdin.end(query);
child.on("exit", (code) => {
  if (code) process.exit(code);
  const row = output.split("\n").find((line) => line.startsWith("{"));
  if (!row) throw Error("Cuenta sin autorización para el reloj ficticio");
  console.log(row);
});
