import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, PDFName } from "pdf-lib";
import { renderCie } from "../shared/pdf/cie.mjs";
import { cieCases, cieFixture } from "../tools/pdf-phase0/cie-fixtures.mjs";
import { BrowserSession, emailToken, env, json } from "./auth-test-client.mjs";

const dir = process.env.PHASE5_REPORT_DIR || "evidence/phase-5";
await mkdir(`${dir}/variants`, { recursive: true });
const results = [];
async function pass(test) {
  results.push({ test, pass: true });
  console.log("PASS", test);
  await writeFile(
    `${dir}/integration.json`,
    JSON.stringify({ pass: false, complete: false, results }, null, 2),
  );
}
const post = async (
  jar,
  path,
  body,
  status = path === "/api/private/documents" ? 201 : 200,
) => json(await jar.request(path, { method: "POST", body }), status);
const get = async (jar, path, status = 200) =>
  json(await jar.request(path), status);
const accounts = [];
const password = randomUUID();
for (let i = 0; i < 2; i++) {
  const jar = new BrowserSession();
  const email = `phase5-${i}-${randomUUID()}@example.invalid`;
  await post(jar, "/api/auth/signup", { email, password });
  await post(jar, "/api/auth/confirm", {
    token_hash: await emailToken(email, "email"),
    type: "email",
  });
  accounts.push({ jar, user: await get(jar, "/api/auth/session") });
}
const [a, b] = accounts;
const profile = {
  empresa_nom: "EMPRESA FICTICIA PERFIL CIE",
  empresa_nif: "FICTICI-EMP",
  empresa_rasic: "PROVA-RASIC",
  empresa_telefon: "000000010",
  empresa_correu: "empresa@example.invalid",
  installador_nom: "PERSONA FICTICIA PERFIL CIE",
  installador_nif: "NIF00001",
  installador_dni: "DNI00002",
  installador_categoria: "Bàsica",
  empresa_via_tipo: "AVI",
  empresa_via_nom: "Carrer de prova",
  empresa_numero: "5",
  empresa_bloc: "A",
  empresa_escala: "1",
  empresa_pis: "2",
  empresa_porta: "3",
  empresa_cp: "08002",
  empresa_municipi: "POBLACIÓ FICTÍCIA",
};
await post(a.jar, "/api/private/profile", { fields: profile, revision: 0 });
let full = (
  await post(a.jar, "/api/private/documents", {
    type: "CIE",
    title: "CIE completo ficticio",
  })
).document;
assert.equal(full.work_data.NIF_2, profile.empresa_nif);
assert.equal(full.work_data.DNIInstallador, profile.installador_dni);
assert.equal(full.work_data.NomCognomsInstalador_2, profile.installador_nom);
assert.equal(full.work_data.CBO_TipusVia_2, "AVI");
assert.equal(full.work_data.TXT_CodiPostal_2, "08002");
assert.equal(Object.keys(full.work_data).length, 18);
assert.equal(full.work_data.TXT_PotenciaMax, undefined);
await post(a.jar, "/api/private/profile", {
  fields: { ...profile, empresa_nom: "PERFIL NUEVO FICTICIO" },
  revision: 1,
});
const second = (
  await post(a.jar, "/api/private/documents", {
    type: "CIE",
    title: "CIE perfil actualizado ficticio",
  })
).document;
assert.equal(second.work_data.NomCognoms_2, "PERFIL NUEVO FICTICIO");
assert.equal(
  (await get(a.jar, `/api/private/documents/${full.id}`)).document.work_data
    .NomCognoms_2,
  profile.empresa_nom,
);
await pass(
  "el perfil copia 18 campos CIE sin confundir NIF y DNI; cambiarlo no altera documentos anteriores",
);
async function save(values, expected = 200) {
  const r = await post(
    a.jar,
    `/api/private/documents/${full.id}/fields`,
    { fields: values, revision: full.revision },
    expected,
  );
  if (expected === 200) full = r.document;
  return r;
}
await save({ ...cieFixture, NomCognoms_2: "CORRECCIÓN SOLO EN ESTE CIE" });
assert.equal(
  (await get(a.jar, "/api/private/profile")).profile.fields.empresa_nom,
  "PERFIL NUEVO FICTICIO",
);
await post(
  a.jar,
  `/api/private/documents/${full.id}/fields`,
  { fields: cieFixture, revision: 0 },
  409,
);
await post(
  b.jar,
  `/api/private/documents/${full.id}/fields`,
  { fields: cieFixture, revision: full.revision },
  404,
);
await post(
  b.jar,
  `/api/private/documents/${full.id}/preview`,
  { revision: full.revision },
  404,
);
for (const values of [
  { RB_TipusActuacio: "NOVA", TXT_CUPS: "NO SE ADMITE" },
  { TXT_CodiPostal: "8001" },
  { TXT_CodiPostal_2: "ABCDE" },
  { TXT_Us: "h", TXT_G: "g3) Auditori" },
  { RB_Requisits: "P1", TXT_P2: "incorrecto" },
  { TXT_Tensio: "230 V", InfoTensioAltre: "400" },
  { SignatureField1: "inventada" },
  { TXT_Us: "c" },
])
  await save(values, 400);
await pass(
  "correcciones propias, revisiones, propiedad, códigos postales y ramas incompatibles protegidos en servidor",
);
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
for (const values of [
  { TXT_CodiPostal: "NO" },
  { RB_TipusActuacio: "NOVA", TXT_CUPS: "NO" },
  { TXT_H: "h1) Temple" },
])
  assert.ok(
    (
      await client.rpc("save_cie", {
        p_document: full.id,
        p_fields: values,
        p_revision: full.revision,
      })
    ).error,
  );
assert.ok(
  (
    await client.rpc("save_cie", {
      p_document: full.id,
      p_fields: {},
      p_revision: null,
    })
  ).error,
);
assert.deepEqual(
  (await client.from("documents").select("id").eq("owner_id", b.user.id)).data,
  [],
);
assert.ok((await client.rpc("claim_brie_job")).error);
await pass(
  "la validación SQL y RLS también bloquean llamadas directas y el acceso a la cola",
);
async function preview(jar, doc) {
  await post(
    jar,
    `/api/private/documents/${doc.id}/preview`,
    { revision: doc.revision },
    202,
  );
  for (let i = 0; i < 90; i++) {
    const { preview: p } = await get(
      jar,
      `/api/private/documents/${doc.id}/preview`,
    );
    if (p?.status === "failed") return { state: p };
    if (p?.status === "ready") {
      const response = await jar.request(
        `/api/private/documents/${doc.id}/preview/file?revision=${doc.revision}`,
      );
      assert.equal(response.status, 200);
      assert.ok(
        response.headers
          .get("content-disposition")
          .includes(`${doc.type}_borrador`),
      );
      assert.match(response.headers.get("cache-control"), /no-store/);
      const bytes = Buffer.from(await response.arrayBuffer());
      const pdf = await PDFDocument.load(bytes);
      assert.equal(pdf.getPageCount(), 2);
      assert.equal(pdf.catalog.has(PDFName.of("AcroForm")), false);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), p.sha256);
      return { state: p, bytes };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("El PDF CIE no terminó dentro del plazo de prueba");
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
const initial = await preview(a.jar, full);
assert.equal(initial.state.status, "ready");
await get(
  b.jar,
  `/api/private/documents/${full.id}/preview/file?revision=${full.revision}`,
  404,
);
await get(
  new BrowserSession(),
  `/api/private/documents/${full.id}/preview/file?revision=${full.revision}`,
  401,
);
const previous = full.revision;
await save({ ...full.work_data, TXT_Num: "7" });
await get(
  a.jar,
  `/api/private/documents/${full.id}/preview/file?revision=${previous}`,
  404,
);
await post(
  a.jar,
  `/api/private/documents/${full.id}/preview`,
  { revision: previous },
  409,
);
await pass(
  "cola deduplicada, PDF CIE de dos páginas, hash, descarga privada e invalidación de revisiones anteriores",
);
const [template, font] = await Promise.all([
  readFile("assets/pdf/cie.pdf"),
  readFile("assets/pdf/LiberationSans-Regular.ttf"),
]);
const variants = [];
for (const item of cieCases) {
  const fields = {
    ...item.values,
    TXT_Observacions:
      "PROVA FICTÍCIA. SENSE VALOR DE CERTIFICAT. SENSE SIGNATURA.",
  };
  await save(fields);
  const result = await preview(a.jar, full);
  assert.equal(result.state.status, "ready", item.id);
  const local = await renderCie(fields, template, font);
  await writeFile(`${dir}/variants/${item.id}.pdf`, result.bytes);
  await writeFile(
    `${dir}/variants/${item.id}-background.pdf`,
    local.backgroundBytes,
  );
  variants.push({
    id: item.id,
    fields,
    operations: local.operations,
    flow: local.flow,
    sha256: createHash("sha256").update(result.bytes).digest("hex"),
    warnings: local.warnings,
  });
}
await writeFile(`${dir}/variants.json`, JSON.stringify(variants, null, 2));
await pass(
  "las once variantes inventariadas se guardan y generan por el worker: base, 50 %, P1/P2, g/h, otros usos, otra tensión, Auditori e incompleto",
);
await save({ ...cieFixture, TXT_Num: "A".repeat(100) });
const failed = await preview(a.jar, full);
assert.equal(failed.state.status, "failed");
assert.deepEqual(failed.state.error_fields, ["TXT_Num"]);
await save({ ...cieFixture, TXT_Num: "0", TXT_Potencia: "0" });
const recovered = await preview(a.jar, full);
assert.equal(recovered.state.status, "ready");
assert.equal(full.work_data.TXT_Num, "0");
await pass(
  "el texto que no cabe falla por campo sin recortarlo; al corregir se genera otra revisión y se conserva cero",
);
await post(b.jar, "/api/private/profile", {
  fields: {
    empresa_cp: "NO-VALIDO",
    installador_categoria: "categoría antigua",
  },
  revision: 0,
});
let legacy = (
  await post(b.jar, "/api/private/documents", {
    type: "CIE",
    title: "Perfil antiguo ficticio",
  })
).document;
assert.equal(legacy.work_data.TXT_CodiPostal_2, "NO-VALIDO");
await post(
  b.jar,
  `/api/private/documents/${legacy.id}/preview`,
  { revision: 0 },
  400,
);
legacy = (
  await post(b.jar, `/api/private/documents/${legacy.id}/fields`, {
    fields: { TXT_CodiPostal_2: "08000", TXT_Categoria: "Bàsica" },
    revision: 0,
  })
).document;
assert.equal((await preview(b.jar, legacy)).state.status, "ready");
assert.equal(
  (await get(b.jar, "/api/private/profile")).profile.fields.empresa_cp,
  "NO-VALIDO",
);
await pass(
  "valores antiguos del perfil se conservan y requieren corrección explícita en CIE; no se adivinan opciones",
);
const brie = (
  await post(a.jar, "/api/private/documents", {
    type: "BRIE",
    title: "BRIE compatible ficticio",
  })
).document;
assert.ok(
  (
    await client.rpc("save_cie", {
      p_document: brie.id,
      p_fields: {},
      p_revision: 0,
    })
  ).error,
);
assert.ok(
  (
    await client.rpc("request_cie_preview", {
      p_document: brie.id,
      p_revision: 0,
    })
  ).error,
);
await post(
  a.jar,
  `/api/private/documents/${second.id}/preview`,
  { revision: second.revision },
  202,
);
const mixed = await Promise.all([preview(a.jar, brie), preview(a.jar, second)]);
assert.ok(mixed.every((x) => x.state.status === "ready"));
await pass(
  "BRIE y CIE comparten el worker limitado; las funciones CIE rechazan un documento BRIE",
);
await writeFile(
  `${dir}/integration.json`,
  JSON.stringify(
    { pass: true, complete: true, groups: results.length, results },
    null,
    2,
  ),
);
console.log(`${results.length} grupos de fase 5 superados.`);
