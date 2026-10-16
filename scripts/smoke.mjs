import assert from "node:assert/strict";

const origin = "http://127.0.0.1:3000";
const checks = [];
const page = await fetch(origin);
assert.equal(page.status, 200);
assert.ok((await page.text()).includes("BoletinExpress"));
for (const [key, value] of [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
])
  assert.equal(page.headers.get(key), value);
assert.equal(page.headers.get("x-powered-by"), null);
checks.push("pagina y cabeceras");
const health = await fetch(`${origin}/api/health`);
assert.equal(health.status, 200);
assert.equal(health.headers.get("cache-control"), "no-store");
assert.equal((await health.json()).service, "boletinexpress-web");
checks.push("liveness sin datos internos");
assert.equal(
  (await fetch(`${origin}/api/health`, { method: "POST" })).status,
  405,
);
checks.push("liveness no permite escrituras");
for (const path of [
  "/api/documents",
  "/plantillas/Plta_ELEC1CertificatInstalElectricaBT.pdf",
  "/.env",
])
  assert.equal((await fetch(`${origin}${path}`)).status, 404);
checks.push("rutas privadas y fuentes no publicadas");
console.log(JSON.stringify({ pass: true, checks }, null, 2));
