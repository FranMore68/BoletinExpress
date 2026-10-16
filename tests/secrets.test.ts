import assert from "node:assert/strict";
import test from "node:test";
import { findings } from "../scripts/check-secrets.mjs";

test("bloquea secretos y entornos privados antes de publicar", () => {
  for (const value of [
    `sk_${"live"}_${"x".repeat(30)}`,
    `sk-${"proj"}-${"x".repeat(40)}`,
    `ghp_${"x".repeat(40)}`,
    "postgresql://user:" + "password@db/app",
  ])
    assert.ok(findings("src/config.ts", value).length);
  assert.ok(findings(".env.production", "").length);
  assert.deepEqual(
    findings(".env.example", "# Añadir los secretos mediante Coolify"),
    [],
  );
  assert.deepEqual(findings("src/config.ts", "const mode = 'evaluation';"), []);
});
