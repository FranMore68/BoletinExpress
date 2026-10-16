import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envFile = process.env.AUTH_TEST_ENV || ".secrets/app.env";
const env = Object.fromEntries(
  (await readFile(envFile, "utf8"))
    .trim()
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const origin = env.APP_URL;
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(origin).hostname),
  "Solo entorno local de evaluación",
);
const results = [];
function pass(test, evidence) {
  results.push({ test, pass: true, evidence });
  writeFileSync(
    "evidence/phase-3/isolation.json",
    JSON.stringify({ pass: false, complete: false, results }, null, 2),
  );
  console.log("PASS", test);
}
class BrowserSession {
  cookies = new Map();
  async request(
    path,
    { method = "GET", body, headers = {}, originHeader = origin } = {},
  ) {
    const res = await fetch(new URL(path, origin), {
      method,
      redirect: "manual",
      headers: {
        Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...(method === "GET" ? {} : { Origin: originHeader }),
        ...(body && !(body instanceof Buffer)
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body: body
        ? body instanceof Buffer
          ? body
          : JSON.stringify(body)
        : undefined,
    });
    for (const cookie of res.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const i = pair.indexOf("=");
      if (/max-age=0(?:;|$)/i.test(cookie))
        this.cookies.delete(pair.slice(0, i));
      else this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return res;
  }
}
async function json(res, status) {
  if (res.status !== status) {
    const body = await res.json().catch(() => ({}));
    assert.equal(
      res.status,
      status,
      `${new URL(res.url).pathname}: ${body.error || "respuesta inesperada"}`,
    );
  }
  return res.json();
}
const mailbox = process.env.AUTH_TEST_MAILBOX || "http://127.0.0.1:54324";
async function emailToken(email, type) {
  for (let i = 0; i < 150; i++) {
    const list = await fetch(
      `${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    ).then((r) => r.json());
    for (const message of list.messages || []) {
      const detail = await fetch(
        `${mailbox}/api/v1/message/${message.ID}`,
      ).then((r) => r.json());
      const match = (detail.HTML || detail.Text || "")
        .replaceAll("&amp;", "&")
        .match(/https?:\/\/[^"<>\s]+\/auth\/confirm\?[^"<>\s]+/);
      if (match) {
        const url = new URL(match[0]);
        if (url.searchParams.get("type") === type)
          return url.searchParams.get("token_hash");
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("No llegó el enlace al buzón local");
}
const suffix = randomUUID();
const password = randomBytes(18).toString("base64url");
const accounts = ["a", "b"].map((letter) => ({
  email: `be-${letter}-${suffix}@example.invalid`,
  jar: new BrowserSession(),
}));
const empty = new BrowserSession();
for (const path of ["/api/auth/session", "/api/private/documents"])
  await json(await empty.request(path), 401);
assert.equal((await empty.request("/cuenta")).status, 307);
pass(
  "rutas privadas y cuenta sin sesión bloqueadas",
  "401 en API y redirección en cuenta",
);
for (const account of accounts) {
  await json(
    await account.jar.request("/api/auth/signup", {
      method: "POST",
      body: { email: account.email, password },
    }),
    200,
  );
  await json(
    await account.jar.request("/api/auth/login", {
      method: "POST",
      body: { email: account.email, password },
    }),
    401,
  );
  const hash = await emailToken(account.email, "email");
  const page = await empty.request(
    `/auth/confirm?token_hash=${hash}&type=email`,
  );
  assert.equal(page.status, 200);
  assert.equal((await account.jar.request("/api/auth/session")).status, 401);
  const confirm = await account.jar.request("/api/auth/confirm", {
    method: "POST",
    body: { token_hash: hash, type: "email" },
  });
  for (const c of confirm.headers.getSetCookie()) {
    assert.ok(/HttpOnly/i.test(c), "Cookie de sesión sin HttpOnly");
    assert.ok(/SameSite=lax/i.test(c), "Cookie de sesión sin SameSite");
  }
  await json(confirm, 200);
  await json(
    await empty.request("/api/auth/confirm", {
      method: "POST",
      body: { token_hash: hash, type: "email" },
    }),
    400,
  );
  account.user = await json(
    await account.jar.request("/api/auth/session"),
    200,
  );
}
pass(
  "registro, confirmación explícita y enlace de un uso",
  "sin acceso antes de confirmar; cookies HttpOnly/SameSite",
);
const [a, b] = accounts;
const docA = (
  await json(
    await a.jar.request("/api/private/documents", {
      method: "POST",
      body: { type: "BRIE", title: "Prueba ficticia cuenta A" },
    }),
    201,
  )
).document;
const docB = (
  await json(
    await b.jar.request("/api/private/documents", {
      method: "POST",
      body: { type: "CIE", title: "Prueba ficticia cuenta B" },
    }),
    201,
  )
).document;
const listA = await json(await a.jar.request("/api/private/documents"), 200);
const listB = await json(await b.jar.request("/api/private/documents"), 200);
assert.deepEqual(
  listA.documents.map((d) => d.id),
  [docA.id],
);
assert.deepEqual(
  listB.documents.map((d) => d.id),
  [docB.id],
);
await json(await b.jar.request(`/api/private/documents/${docA.id}`), 404);
await json(await empty.request(`/api/private/documents/${docA.id}`), 401);
pass(
  "listas y documento ajeno aislados en BFF",
  "A y B solo ven sus filas; ID de A devuelve 404 a B",
);
for (const body of [
  { type: "BRIE", title: "Inyección propietario", owner_id: b.user.id },
  { type: "BRIE", title: "Estado manipulado", status: "validated" },
])
  await json(
    await a.jar.request("/api/private/documents", { method: "POST", body }),
    400,
  );
await json(
  await a.jar.request("/api/private/documents", {
    method: "POST",
    body: { type: "BRIE", title: "CSRF" },
    originHeader: "https://evil.invalid",
  }),
  403,
);
assert.equal(
  (
    await a.jar.request("/api/credits", {
      method: "POST",
      body: { balance: 100 },
    })
  ).status,
  404,
);
assert.equal(
  (
    await a.jar.request(`/api/private/documents/${docA.id}`, {
      method: "PATCH",
      body: { status: "validated" },
    })
  ).status,
  405,
);
pass(
  "origen, propietario, estado y saldo manipulados bloqueados",
  "403/400/405/404 según operación",
);
const pdf = await readFile(
  new URL("../public/demo/BRIE-ejemplo.pdf", import.meta.url),
);
await json(
  await b.jar.request(`/api/private/documents/${docA.id}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: pdf,
  }),
  404,
);
await json(
  await a.jar.request(`/api/private/documents/${docA.id}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: Buffer.from("no es pdf"),
  }),
  400,
);
await json(
  await a.jar.request(`/api/private/documents/${docA.id}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: Buffer.alloc(2097153),
  }),
  413,
);
const uploaded = await json(
  await a.jar.request(`/api/private/documents/${docA.id}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: pdf,
  }),
  201,
);
const fileId = uploaded.file.id;
for (const suffix of ["", "?view=1"]) {
  const res = await a.jar.request(`/api/private/files/${fileId}${suffix}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control"), /no-store/);
  assert.match(
    res.headers.get("content-disposition"),
    suffix ? /inline/ : /attachment/,
  );
  assert.equal(
    createHash("sha256")
      .update(Buffer.from(await res.arrayBuffer()))
      .digest("hex"),
    createHash("sha256").update(pdf).digest("hex"),
  );
  await json(await b.jar.request(`/api/private/files/${fileId}${suffix}`), 404);
  await json(await empty.request(`/api/private/files/${fileId}${suffix}`), 401);
}
pass(
  "PDF privado, vista y descarga autenticadas",
  "bytes idénticos; misma URL denegada a B y anónimo; tipo/tamaño controlados",
);
const direct = accounts.map(() =>
  createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
);
for (let i = 0; i < 2; i++) {
  const result = await direct[i].auth.signInWithPassword({
    email: accounts[i].email,
    password,
  });
  assert.equal(result.error, null);
  accounts[i].token = result.data.session.access_token;
}
const hidden = await direct[1].from("documents").select("*").eq("id", docA.id);
assert.equal(hidden.error, null);
assert.deepEqual(hidden.data, []);
const hiddenFiles = await direct[1]
  .from("document_files")
  .select("*")
  .eq("document_id", docA.id);
assert.equal(hiddenFiles.error, null);
assert.deepEqual(hiddenFiles.data, []);
const meta = await direct[0]
  .from("document_files")
  .select("*")
  .eq("id", fileId)
  .single();
assert.equal(meta.error, null);
const path = meta.data.object_path;
assert.ok((await direct[1].storage.from("documents").download(path)).error);
assert.ok(
  (await direct[0].storage.from("documents").getPublicUrl(path)).data.publicUrl,
);
const publicRes = await fetch(
  `${env.SUPABASE_URL}/storage/v1/object/public/documents/${path}`,
  { headers: { apikey: env.SUPABASE_ANON_KEY } },
);
assert.equal(publicRes.status, 404);
assert.ok(
  (await direct[0].storage.from("documents").createSignedUrl(path, 60)).error,
);
const insert = await direct[0]
  .from("documents")
  .insert({ owner_id: b.user.id, type: "BRIE", title: "Ajeno" });
assert.ok(insert.error);
assert.ok(
  (
    await direct[0]
      .from("documents")
      .update({ status: "validated" })
      .eq("id", docA.id)
  ).error,
);
assert.ok((await direct[1].rpc("reserve_file", { p_document: docA.id })).error);
assert.ok(
  (
    await direct[1].storage
      .from("documents")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true })
  ).error,
);
pass(
  "RLS directa y Storage rechazan acceso y cambios cruzados",
  "sin depender de la aplicación; bucket privado y firmas/publicaciones bloqueadas",
);
const concurrent = await Promise.all(
  Array.from({ length: 4 }, (_, i) =>
    a.jar.request("/api/private/documents", {
      method: "POST",
      body: { type: "BRIE", title: `Concurrente ${i}` },
    }),
  ),
);
assert.equal(concurrent.filter((r) => r.status === 201).length, 2);
assert.equal(concurrent.filter((r) => r.status === 409).length, 2);
pass(
  "límite de tres borradores concurrentes",
  "dos aceptados y dos rechazados partiendo de un borrador",
);
await json(
  await a.jar.request("/api/auth/password", {
    method: "POST",
    body: { password: randomBytes(18).toString("hex") },
  }),
  403,
);
const recover = await a.jar.request("/api/auth/recover", {
  method: "POST",
  body: { email: a.email },
});
await json(recover, 200);
const unknown = await json(
  await empty.request("/api/auth/recover", {
    method: "POST",
    body: { email: `absent-${suffix}@example.invalid` },
  }),
  200,
);
assert.deepEqual(unknown, { ok: true });
const recoveryHash = await emailToken(a.email, "recovery");
const recovery = new BrowserSession();
await json(
  await recovery.request("/api/auth/confirm", {
    method: "POST",
    body: { token_hash: recoveryHash, type: "recovery" },
  }),
  200,
);
const newPassword = randomBytes(18).toString("base64url");
await json(
  await recovery.request("/api/auth/password", {
    method: "POST",
    body: { password: newPassword },
  }),
  200,
);
await json(await a.jar.request("/api/auth/session"), 401);
await json(await a.jar.request(`/api/private/files/${fileId}`), 401);
await json(
  await empty.request("/api/auth/login", {
    method: "POST",
    body: { email: a.email, password },
  }),
  401,
);
await json(
  await empty.request("/api/auth/login", {
    method: "POST",
    body: { email: a.email, password: newPassword },
  }),
  200,
);
pass(
  "recuperación restringida y cierre de sesiones anteriores",
  "sin prueba recovery no cambia; contraseña anterior y cookies previas dejan de servir",
);
const revoked = await fetch(`${env.SUPABASE_URL}/rest/v1/documents`, {
  headers: {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${a.token}`,
  },
});
assert.equal(revoked.status, 200);
assert.deepEqual(await revoked.json(), []);
pass(
  "JWT revocado bloqueado por RLS durante su vigencia",
  "sesión eliminada ya no permite leer filas",
);
const cookie = [...b.jar.cookies].find(([k]) =>
  /-auth-token(?:\.\d+)?$/.test(k),
);
assert.ok(cookie);
const tampered = new BrowserSession();
tampered.cookies.set(cookie[0], `${cookie[1].slice(0, -3)}bad`);
await json(await tampered.request("/api/auth/session"), 401);
const data = await readFile(".secrets/supabase.env", "utf8");
const jwtSecret = data
  .split("\n")
  .find((l) => l.startsWith("JWT_SECRET="))
  .slice("JWT_SECRET=".length);
const header = Buffer.from(
  JSON.stringify({ alg: "HS256", typ: "JWT" }),
).toString("base64url");
const claim = JSON.parse(
  Buffer.from(b.token.split(".")[1], "base64url").toString(),
);
claim.exp = Math.floor(Date.now() / 1000) - 60;
const payload = Buffer.from(JSON.stringify(claim)).toString("base64url");
const expired = `${header}.${payload}.${createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url")}`;
const denied = await fetch(`${env.SUPABASE_URL}/rest/v1/documents`, {
  headers: {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${expired}`,
  },
});
assert.equal(denied.status, 401);
pass(
  "cookies manipuladas y JWT caducado rechazados",
  "401; el JWT de prueba tiene firma correcta pero exp vencido",
);
await json(
  await b.jar.request("/api/auth/logout", { method: "POST", body: {} }),
  200,
);
await json(await b.jar.request("/api/auth/session"), 401);
pass(
  "cierre de sesión y acceso posterior bloqueado",
  "cookies retiradas y sesión revocada",
);
const limited = [];
for (let i = 0; i < 6; i++)
  limited.push(
    (
      await new BrowserSession().request("/api/auth/login", {
        method: "POST",
        body: { email: b.email, password: "incorrecta-ficticia" },
      })
    ).status,
  );
assert.ok(limited.includes(429));
pass(
  "intentos de acceso limitados en servidor",
  "el sexto intento repetido queda limitado por cuota persistente",
);
await mkdir("evidence/phase-3", { recursive: true });
await writeFile(
  "evidence/phase-3/isolation.json",
  JSON.stringify(
    {
      pass: true,
      complete: true,
      accounts: "dos cuentas ficticias distintas; credenciales no conservadas",
      pdfSha256: createHash("sha256").update(pdf).digest("hex"),
      results,
    },
    null,
    2,
  ),
);
console.log(`${results.length} comprobaciones de integración superadas.`);
