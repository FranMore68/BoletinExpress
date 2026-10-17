import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";

const origin = "http://127.0.0.1:3000";
const statePath = ".secrets/auth-promotion-continuity.json";
const evidence = "evidence/phase-3/auth-continuity-2026-10-17.json";
const mode = process.argv[2];
assert.ok(["before", "after"].includes(mode), "Usar before o after");
let cookie = "";
async function request(path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  assert.ok(response.ok, `HTTP ${response.status}: ${path}`);
  return response.json();
}
if (mode === "before") {
  await assert.rejects(readFile(statePath), { code: "ENOENT" });
  const email = `continuity-${randomUUID()}@example.invalid`;
  await request("/api/auth/signup", { email, password: randomUUID() });
  let hash;
  for (let attempt = 0; attempt < 30 && !hash; attempt++) {
    const list = await fetch(
      `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    ).then((r) => r.json());
    for (const message of list.messages || []) {
      const mail = await fetch(
        `http://127.0.0.1:54324/api/v1/message/${message.ID}`,
      ).then((r) => r.json());
      const link = (mail.HTML || mail.Text || "")
        .replaceAll("&amp;", "&")
        .match(/https?:\/\/[^"<>\s]+\/auth\/confirm\?[^"<>\s]+/);
      if (link) hash = new URL(link[0]).searchParams.get("token_hash");
    }
    if (!hash) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(hash, "Sin confirmación local");
  await request("/api/auth/confirm", { token_hash: hash, type: "email" });
  const user = await request("/api/auth/session");
  const { document } = await request("/api/private/documents", {
    type: "BRIE",
    title: "Continuidad ficticia de migración",
  });
  await writeFile(
    statePath,
    JSON.stringify({ cookie, userId: user.id, documentId: document.id }),
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Preparada sesión y borrador ficticios anteriores al cambio; credenciales no mostradas.",
  );
} else {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  cookie = state.cookie;
  const user = await request("/api/auth/session");
  assert.equal(user.id, state.userId);
  const { document } = await request(
    `/api/private/documents/${state.documentId}`,
  );
  assert.equal(document.id, state.documentId);
  await request("/api/auth/logout", {});
  await writeFile(
    evidence,
    `${JSON.stringify({ pass: true, sessionSurvivedAuthMigration: true, existingDraftPreserved: true, sameUserAndDocument: true, testSessionRevokedAfterCheck: true }, null, 2)}\n`,
  );
  await unlink(statePath);
  console.log(
    "PASS: sesión anterior y borrador conservados; sesión ficticia cerrada después de comprobarlo.",
  );
}
