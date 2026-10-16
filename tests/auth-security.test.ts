import assert from "node:assert/strict";
import test from "node:test";
import { authCopy } from "../src/lib/i18n/auth-copy.ts";
import {
  AccessError,
  checkMutation,
  emailValue,
  jsonBody,
  passwordValue,
  recoveryProof,
  uuid,
  validEmailHash,
  validRecoveryProof,
} from "../src/modules/auth/security.ts";

test("las mutaciones requieren el origen propio y rechazan peticiones cruzadas", () => {
  process.env.APP_URL = "http://127.0.0.1:3000";
  checkMutation(
    new Request("http://127.0.0.1:3000/api", {
      headers: { origin: process.env.APP_URL },
    }),
  );
  const rejected: Record<string, string>[] = [
    {},
    { origin: "https://otro.example" },
    { origin: process.env.APP_URL, "sec-fetch-site": "cross-site" },
  ];
  for (const headers of rejected)
    assert.throws(
      () =>
        checkMutation(new Request("http://127.0.0.1:3000/api", { headers })),
      AccessError,
    );
});
test("validación de credenciales, identificadores y tamaño del cuerpo", async () => {
  assert.equal(
    emailValue({ email: "  cuenta@EXAMPLE.invalid " }),
    "cuenta@example.invalid",
  );
  assert.throws(() => emailValue({ email: "a@" }));
  assert.throws(() => passwordValue({ password: "corta" }));
  assert.throws(() => uuid("../otro"));
  assert.equal(
    uuid("12345678-1234-4234-8234-123456789012"),
    "12345678-1234-4234-8234-123456789012",
  );
  await assert.rejects(
    jsonBody(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "x".repeat(9000),
      }),
    ),
    (e) => e instanceof AccessError && e.status === 413,
  );
  await assert.rejects(
    jsonBody(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      }),
    ),
  );
});
test("el permiso de recuperación se vincula a usuario y sesión", () => {
  process.env.AUTH_PROOF_SECRET = "a".repeat(64);
  const now = Date.now();
  const proof = recoveryProof("usuarioA", "sesionA", now);
  assert.ok(validRecoveryProof(proof, "usuarioA", "sesionA", now));
  assert.ok(!validRecoveryProof(proof, "usuarioB", "sesionA", now));
  assert.ok(!validRecoveryProof(proof, "usuarioA", "sesionB", now));
  assert.ok(!validRecoveryProof(proof, "usuarioA", "sesionA", now + 601000));
  assert.ok(
    !validRecoveryProof(
      proof.replace(/^\d+/, "9999999999"),
      "usuarioA",
      "sesionA",
      now,
    ),
  );
  assert.ok(!validRecoveryProof("", "usuarioA", "sesionA", now));
});
test("el acceso y almacenamiento tienen mensajes completos en ES y CA", () => {
  for (const pair of Object.values(authCopy)) {
    assert.equal(pair.length, 2);
    for (const value of pair) assert.ok(value.trim());
  }
});

test("admite el hash PKCE oficial sin aceptar formatos arbitrarios", () => {
  const hash = "a".repeat(64);
  assert.ok(validEmailHash(hash));
  assert.ok(validEmailHash(`pkce_${hash}`));
  for (const bad of ["", "pkce_abc", `otro_${hash}`, `${hash} <script>`])
    assert.equal(validEmailHash(bad), false);
});
