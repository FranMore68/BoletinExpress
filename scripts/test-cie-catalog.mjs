import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PDFDocument, PDFName } from "pdf-lib";
import { renderCie } from "../shared/pdf/cie.mjs";
import { cieFixture } from "../tools/pdf-phase0/cie-fixtures.mjs";

const dir = process.env.PHASE5_REPORT_DIR || "evidence/phase-5";
await mkdir(dir, { recursive: true });
const schema = JSON.parse(
  await readFile("src/modules/documents/cie-fields.json", "utf8"),
);
const [template, font] = await Promise.all([
  readFile("assets/pdf/cie.pdf"),
  readFile("assets/pdf/LiberationSans-Regular.ttf"),
]);
const results = [];
async function verify(id, values, key, option) {
  for (const f of schema.filter((f) => f.condition)) {
    const c = f.condition;
    const parent = values[c.key] || "";
    if (c.values ? !c.values.includes(parent) : c.not?.includes(parent))
      delete values[f.key];
  }
  const result = await renderCie(values, template, font);
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 2);
  assert.equal(pdf.catalog.has(PDFName.of("AcroForm")), false);
  if (key) {
    const op = result.operations.find((x) => x.name === key);
    assert.ok(op, id);
    assert.equal(op.value, option, id);
    assert.equal(
      op.text,
      undefined === op.text
        ? undefined
        : key.startsWith("CBO_TipusVia") && option === "0"
          ? ""
          : schema
              .find((f) => f.key === key)
              .choices.find((c) => c.value === option).label[1],
      id,
    );
  }
  for (let i = 0; i < result.operations.length; i++) {
    const a = result.operations[i];
    assert.ok(
      a.rect.x >= 0 &&
        a.rect.y >= 0 &&
        a.rect.x + a.rect.width <= 595.01 &&
        a.rect.y + a.rect.height <= 842.01,
      id,
    );
    for (const b of result.operations.slice(i + 1))
      if (a.page === b.page) {
        const x =
          Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width) -
          Math.max(a.rect.x, b.rect.x);
        const y =
          Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height) -
          Math.max(a.rect.y, b.rect.y);
        assert.ok(x <= 0 || y <= 0, `${id}: ${a.name}/${b.name}`);
      }
  }
  results.push({ id, pass: true, pages: 2 });
}
for (const f of schema.filter((f) => f.choices))
  for (const c of f.choices) {
    const fields = { ...cieFixture, [f.key]: c.value };
    if (f.condition?.values) fields[f.condition.key] = f.condition.values[0];
    await verify(`${f.key}:${c.value}`, fields, f.key, c.value);
  }
for (const admin of ["P1", "P2", "MEMORIA"])
  for (const use of schema.find((f) => f.key === "TXT_Us").choices) {
    await verify(`class/use:${admin}/${use.value}`, {
      ...cieFixture,
      RB_Requisits: admin,
      TXT_Us: use.value,
    });
  }
for (const action of ["AMPLIACIO", "MODIFICACIO"])
  for (const percent of ["SI", "NO"])
    await verify(`50:${action}/${percent}`, {
      ...cieFixture,
      RB_TipusActuacio: action,
      DDLAmpliaMod: percent,
    });
await writeFile(
  `${dir}/catalog.json`,
  JSON.stringify({ pass: true, cases: results.length, results }, null, 2),
);
console.log(
  `${results.length} casos del catálogo CIE superados sin solapamientos ni recortes.`,
);
