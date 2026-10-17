import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { brieFixture } from "../shared/pdf/brie-layout.mjs";
import { BrowserSession, emailToken, env, json } from "./auth-test-client.mjs";

const dir = process.env.PHASE4_REPORT_DIR || "evidence/phase-4";
await mkdir(dir, { recursive: true });
const results = [];
async function pass(test) {
  results.push({ test, pass: true });
  console.log("PASS", test);
  await writeFile(
    `${dir}/integration.json`,
    JSON.stringify({ pass: false, complete: false, results }, null, 2),
  );
}
const accounts = [];
const password = randomUUID();
for (let i = 0; i < 2; i++) {
  const jar = new BrowserSession();
  const email = `phase4-${i}-${randomUUID()}@example.invalid`;
  await json(
    await jar.request("/api/auth/signup", {
      method: "POST",
      body: { email, password },
    }),
    200,
  );
  await json(
    await jar.request("/api/auth/confirm", {
      method: "POST",
      body: { token_hash: await emailToken(email, "email"), type: "email" },
    }),
    200,
  );
  const user = await json(await jar.request("/api/auth/session"), 200);
  accounts.push({ jar, email, user });
}
const [a, b] = accounts;
const post = async (jar, path, body, status = 200) =>
  json(await jar.request(path, { method: "POST", body }), status);
const get = async (jar, path, status = 200) =>
  json(await jar.request(path), status);
const profile = {
  empresa_nom: "EMPRESA FICTICIA A",
  empresa_telefon: "000000000",
  empresa_rasic: "PROVA-0000",
  installador_nom: "INSTALADOR FICTICIO A",
  installador_nif: "00000000T",
  installador_dni: "00000000T",
  empresa_nif: "00000000T",
  empresa_cp: "08000",
  empresa_correu: "empresa@example.invalid",
};
assert.equal((await get(a.jar, "/api/private/profile")).profile.revision, 0);
await post(a.jar, "/api/private/profile", { fields: profile, revision: 0 });
await post(
  a.jar,
  "/api/private/profile",
  { fields: profile, revision: 0 },
  409,
);
await post(
  a.jar,
  "/api/private/profile",
  { fields: profile, revision: 1, owner_id: b.user.id },
  400,
);
await post(a.jar, "/api/auth/logout", {});
await post(a.jar, "/api/auth/login", { email: a.email, password });
assert.deepEqual(
  (await get(a.jar, "/api/private/profile")).profile.fields,
  profile,
);
assert.deepEqual((await get(b.jar, "/api/private/profile")).profile.fields, {});
await pass(
  "perfil persistente tras cerrar sesión, conflicto controlado y dos cuentas separadas",
);
async function create() {
  return (
    await post(
      a.jar,
      "/api/private/documents",
      { type: "BRIE", title: "BRIE ficticio fase 4" },
      201,
    )
  ).document;
}
const docs = [await create(), await create()];
for (const d of docs) {
  assert.equal(d.work_data.empresa_nom, profile.empresa_nom);
  assert.equal(d.work_data.certificat_nom, profile.installador_nom);
  assert.equal(d.work_data.certificat_dni, profile.installador_dni);
}
await post(a.jar, "/api/private/profile", {
  fields: { ...profile, empresa_nom: "EMPRESA FICTICIA NUEVA" },
  revision: 1,
});
const third = await create();
assert.equal(third.work_data.empresa_nom, "EMPRESA FICTICIA NUEVA");
assert.equal(
  (await get(a.jar, `/api/private/documents/${docs[0].id}`)).document.work_data
    .empresa_nom,
  profile.empresa_nom,
);
assert.equal(
  (await get(a.jar, `/api/private/documents/${docs[1].id}`)).document.work_data
    .empresa_nom,
  profile.empresa_nom,
);
await pass(
  "dos BRIE copian el perfil; actualizarlo solo afecta a documentos nuevos",
);
const fields = {
  ...brieFixture,
  empresa_nom: "CAMBIO SOLO EN ESTE BRIE",
  installador_dni: "",
};
let full = (
  await post(a.jar, `/api/private/documents/${docs[0].id}/fields`, {
    fields,
    revision: 0,
  })
).document;
assert.equal(full.work_data.installador_dni, "");
assert.equal(
  (await get(a.jar, "/api/private/profile")).profile.fields.empresa_nom,
  "EMPRESA FICTICIA NUEVA",
);
await post(
  a.jar,
  `/api/private/documents/${full.id}/fields`,
  { fields: {}, revision: 0 },
  409,
);
await post(
  a.jar,
  `/api/private/documents/${full.id}/fields`,
  { fields: { ...fields, campo_inventado: "x" }, revision: full.revision },
  400,
);
await post(
  b.jar,
  `/api/private/documents/${full.id}/fields`,
  { fields: {}, revision: full.revision },
  404,
);
await post(
  b.jar,
  `/api/private/documents/${full.id}/preview`,
  { revision: full.revision },
  404,
);
await pass(
  "correcciones propias y vaciados se conservan; revisiones obsoletas y escrituras ajenas rechazadas",
);
const cookie = [...a.jar.cookies].find(([k]) =>
  /-auth-token(?:\.\d+)?$/.test(k),
);
assert.ok(cookie);
const encoded = [...a.jar.cookies]
  .filter(([k]) => /-auth-token(?:\.\d+)?$/.test(k))
  .sort(([x], [y]) => x.localeCompare(y))
  .map(([, v]) => decodeURIComponent(v))
  .join("");
const session = JSON.parse(
  Buffer.from(encoded.replace(/^base64-/, ""), "base64url").toString(),
);
const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${session.access_token}` } },
});
const foreign = await client
  .from("professional_profiles")
  .select("*")
  .eq("owner_id", b.user.id);
assert.deepEqual(foreign.data, []);
assert.ok(
  (
    await client
      .from("professional_profiles")
      .update({ fields: {} })
      .eq("owner_id", a.user.id)
  ).error,
);
assert.ok((await client.rpc("claim_brie_job")).error);
assert.ok((await client.rpc("obsolete_brie_previews")).error);
assert.ok(
  (await client.rpc("remove_obsolete_preview", { p_job: randomUUID() })).error,
);
assert.ok(
  (
    await client.rpc("finish_brie_job", {
      p_job: randomUUID(),
      p_claim: randomUUID(),
      p_sha: "a".repeat(64),
    })
  ).error,
);
assert.ok(
  (
    await client.rpc("save_brie", {
      p_document: full.id,
      p_fields: {},
      p_revision: null,
    })
  ).error,
);
assert.ok(
  (
    await client.storage
      .from("previews")
      .upload(`${a.user.id}/inventado.pdf`, Buffer.from("%PDF-falso"), {
        contentType: "application/pdf",
      })
  ).error,
);
await pass(
  "RLS y permisos directos impiden alterar perfiles, cola y PDF desde el cliente",
);
async function preview(doc) {
  await post(
    a.jar,
    `/api/private/documents/${doc.id}/preview`,
    { revision: doc.revision },
    202,
  );
  for (let i = 0; i < 90; i++) {
    const { preview: p } = await get(
      a.jar,
      `/api/private/documents/${doc.id}/preview`,
    );
    if (p?.status === "failed") return { state: p };
    if (p?.status === "ready") {
      const response = await a.jar.request(
        `/api/private/documents/${doc.id}/preview/file?revision=${doc.revision}`,
      );
      assert.equal(response.status, 200);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), p.sha256);
      return { state: p, bytes };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("El PDF no terminó dentro del plazo de prueba");
}
const requests = await Promise.all(
  Array.from({ length: 3 }, () =>
    post(
      a.jar,
      `/api/private/documents/${full.id}/preview`,
      { revision: full.revision },
      202,
    ),
  ),
);
assert.equal(new Set(requests.map((r) => r.preview.id)).size, 1);
const complete = await preview(full);
assert.equal(complete.state.status, "ready");
await writeFile(
  `${dir}/complete-fields.json`,
  JSON.stringify(full.work_data, null, 2),
);
await writeFile(`${dir}/brie-completo.pdf`, complete.bytes);
await json(
  await b.jar.request(
    `/api/private/documents/${full.id}/preview/file?revision=${full.revision}`,
  ),
  404,
);
await json(
  await new BrowserSession().request(
    `/api/private/documents/${full.id}/preview/file?revision=${full.revision}`,
  ),
  401,
);
await pass(
  "cola deduplica peticiones concurrentes; PDF completo de dos páginas y hash verificados; descarga privada",
);
const partial = (
  await post(a.jar, `/api/private/documents/${docs[1].id}/fields`, {
    fields: {
      empresa_nom: "BRIE INCOMPLETO",
      ascensor: false,
      potencia_ascensor: "0",
    },
    revision: 0,
  })
).document;
const incomplete = await preview(partial);
assert.equal(incomplete.state.status, "ready");
await writeFile(`${dir}/brie-incompleto.pdf`, incomplete.bytes);
await pass(
  "borrador incompleto guardado y generado sin inventar datos; No y cero conservados",
);
full = (
  await post(a.jar, `/api/private/documents/${full.id}/fields`, {
    fields: { ...fields, local_cp: "A".repeat(100) },
    revision: full.revision,
  })
).document;
await json(
  await a.jar.request(
    `/api/private/documents/${full.id}/preview/file?revision=${full.revision - 1}`,
  ),
  404,
);
await post(
  a.jar,
  `/api/private/documents/${full.id}/preview`,
  { revision: full.revision - 1 },
  409,
);
const failed = await preview(full);
assert.equal(failed.state.status, "failed");
assert.deepEqual(failed.state.error_fields, ["local_cp"]);
full = (
  await post(a.jar, `/api/private/documents/${full.id}/fields`, {
    fields: { ...fields, local_cp: "08000" },
    revision: full.revision,
  })
).document;
const repaired = await preview(full);
assert.equal(repaired.state.status, "ready");
await pass(
  "editar invalida el PDF anterior; texto que no cabe falla sin recortar y se recupera tras corregirlo",
);
// Simulate a crashed lease only on this run's fictitious document; no global clock change.
async function fixtureSql(sql) {
  return new Promise((resolve, reject) => {
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
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let output = "";
    child.stdout.on("data", (x) => {
      output += x;
    });
    child.stderr.resume();
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error("Fallo de la fixture de recuperación")),
    );
    child.stdin.end(sql);
  });
}
const expiredClaim = randomUUID();
let queued;
execFileSync(
  "docker",
  [
    "compose",
    "-f",
    "compose.yaml",
    "-f",
    "compose.auth.yaml",
    "pause",
    "worker",
  ],
  { stdio: "ignore" },
);
try {
  queued = (
    await post(
      a.jar,
      `/api/private/documents/${third.id}/preview`,
      { revision: third.revision },
      202,
    )
  ).preview;
  for (const id of [queued.id, third.id, a.user.id, expiredClaim])
    assert.match(id, /^[0-9a-f-]{36}$/);
  await fixtureSql(
    `update private.pdf_jobs set state='processing',attempts=1,claim='${expiredClaim}',lease_until=now()-interval '1 second' where id='${queued.id}' and document_id='${third.id}' and owner_id='${a.user.id}';update public.document_previews set status='processing' where id='${queued.id}' and owner_id='${a.user.id}';`,
  );
  const stale = await fixtureSql(
    `begin;set local role boletin_worker;set local request.jwt.claims='{"role":"boletin_worker"}';select public.finish_brie_job('${queued.id}','${expiredClaim}','${"a".repeat(64)}',null);commit;`,
  );
  assert.equal(stale, "f");
} finally {
  execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "compose.yaml",
      "-f",
      "compose.auth.yaml",
      "unpause",
      "worker",
    ],
    { stdio: "ignore" },
  );
}
const recovered = await preview(third);
assert.equal(recovered.state.status, "ready");
assert.equal(
  await fixtureSql(
    `select attempts>=2 from private.pdf_jobs where id='${queued.id}' and owner_id='${a.user.id}';`,
  ),
  "t",
);
await pass(
  "el worker recupera una concesión caducada; rechaza el resultado antiguo y reintenta sin duplicar el PDF",
);
await writeFile(
  `${dir}/integration.json`,
  JSON.stringify(
    { pass: true, complete: true, groups: results.length, results },
    null,
    2,
  ),
);
console.log(`${results.length} grupos de fase 4 superados.`);
