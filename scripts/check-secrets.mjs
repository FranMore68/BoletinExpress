import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export function findings(file, text) {
  const result = [];
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith(".env.example"))
    result.push("archivo de entorno");
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/,
    /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{30,}/,
    /\b(?:sb_secret_|re_)[A-Za-z0-9_]{24,}/,
    /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/,
  ];
  if (patterns.some((pattern) => pattern.test(text)))
    result.push("posible credencial");
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  let failed = false;
  for (const file of files) {
    const bytes = readFileSync(file);
    // El nombre se revisa también para archivos binarios.
    const issues = findings(
      file,
      bytes.includes(0) ? "" : bytes.toString("utf8"),
    );
    if (issues.length) {
      console.error(`${file}: ${issues.join(", ")}`);
      failed = true;
    }
  }
  if (failed) process.exitCode = 1;
  else
    console.log(
      `Sin patrones de secretos detectados en ${files.length} archivos versionables.`,
    );
}
