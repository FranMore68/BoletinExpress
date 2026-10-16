import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const secrets = readFileSync(".secrets/supabase.env", "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => l.slice(l.indexOf("=") + 1))
  .filter((v) => v.length > 16);
let output = "";
for (const service of ["postgres", "auth", "storage"]) {
  try {
    output += execFileSync(
      "docker",
      [
        "compose",
        "--env-file",
        ".secrets/supabase.env",
        "-f",
        "infra/supabase/compose.yaml",
        "logs",
        "--no-color",
        "--tail",
        "35",
        service,
      ],
      { encoding: "utf8", timeout: 10000, stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    output += `No se pudieron consultar los registros de ${service}.\n`;
  }
}
try {
  output += execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "compose.yaml",
      "-f",
      "compose.auth.yaml",
      "logs",
      "--no-color",
      "--tail",
      "25",
      "web",
    ],
    { encoding: "utf8", timeout: 10000, stdio: ["ignore", "pipe", "pipe"] },
  );
} catch {
  output += "No se pudieron consultar los registros de web.\n";
}
for (const secret of secrets) output = output.replaceAll(secret, "[REDACTED]");
output = output.replace(
  /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/g,
  "postgres://[REDACTED]@",
);
writeFileSync("evidence/phase-3/services-diagnosis.log", output);
console.log(output);
