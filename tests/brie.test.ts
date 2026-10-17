import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  brieFields,
  normalizeFields,
  profileFields,
} from "../src/modules/documents/brie-schema.ts";

test("todos los campos del BRIE coinciden con el inventario PDF aprobado", async () => {
  const { brieFields: layout } = await import("../shared/pdf/brie-layout.mjs");
  assert.deepEqual(
    brieFields.map((f) => f.key).sort(),
    Object.keys(layout).sort(),
  );
  assert.equal(new Set(brieFields.map((f) => f.key)).size, 59);
  for (const f of [...brieFields, ...profileFields]) {
    assert.ok(f.label[0]);
    assert.ok(f.label[1]);
  }
});
test("el formulario conserva No, cero y correcciones vaciadas", () => {
  assert.deepEqual(
    normalizeFields(
      { ascensor: false, potencia_ascensor: "0", installador_nom: "" },
      brieFields,
    ),
    { ascensor: false, potencia_ascensor: "0", installador_nom: "" },
  );
  assert.deepEqual(
    normalizeFields({ empresa_nom: "CAMBIO MANUAL" }, profileFields),
    { empresa_nom: "CAMBIO MANUAL" },
  );
});
test("rechaza campos inventados, tipos incorrectos, opciones desconocidas y contenido excesivo", () => {
  for (const data of [
    { owner_id: "otro" },
    { ascensor: "No" },
    { exemplar: "otro" },
    { comentaris: "x".repeat(601) },
    JSON.parse('{"__proto__":"x"}'),
    { titular_nom: String.fromCharCode(0) },
  ])
    assert.throws(() => normalizeFields(data, brieFields));
  assert.throws(() => normalizeFields([], brieFields));
});
test("la plantilla privada es idéntica al original y la fuente al recurso de fase 0", async () => {
  assert.deepEqual(
    await readFile("assets/pdf/brie.pdf"),
    await readFile("plantillas/Plta_ButlletiReconeixementBT.pdf"),
  );
  assert.equal(
    createHash("sha256")
      .update(await readFile("assets/pdf/LiberationSans-Regular.ttf"))
      .digest("hex"),
    "f8ace1f892b2bd9dc1792ba7f097fa7588f84fed48321480e04de5390828221f",
  );
});
