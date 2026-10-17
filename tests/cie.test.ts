import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  activeCieValues,
  cieFieldActive,
  cieFields,
  normalizeCieFields,
} from "../src/modules/documents/cie-schema.ts";

const layout = JSON.parse(await readFile("shared/pdf/cie-layout.json", "utf8"));
test("los 70 campos y las opciones CIE conservan el inventario aprobado y etiquetas ES/CA", () => {
  assert.equal(cieFields.length, 70);
  assert.deepEqual(
    cieFields.map((f) => f.key).sort(),
    Object.keys(layout.fields).sort(),
  );
  for (const f of cieFields) {
    assert.ok(f.label[0] && f.label[1]);
    const options = layout.fields[f.key].choices;
    if (options) {
      assert.deepEqual(
        f.choices?.map((c) => c.value).sort(),
        Object.keys(options).sort(),
      );
      for (const c of f.choices || []) {
        assert.ok(c.label[0] && c.label[1]);
        const values = {
          [f.key]: c.value,
          ...(f.condition?.values
            ? { [f.condition.key]: f.condition.values[0] }
            : {}),
        };
        assert.doesNotThrow(() => normalizeCieFields(values));
      }
    }
  }
});
test("las ramas y CUPS se excluyen al cambiar la selección sin borrar los valores locales", () => {
  const local = {
    RB_TipusActuacio: "NOVA",
    TXT_CUPS: "dato antiguo",
    RB_Requisits: "P2",
    TXT_P1: "dato anterior",
    TXT_Us: "h",
    TXT_G: "g3) Auditori",
    TXT_Tensio: "230 V",
    InfoTensioAltre: "otro",
  };
  assert.deepEqual(activeCieValues(local), {
    RB_TipusActuacio: "NOVA",
    RB_Requisits: "P2",
    TXT_Us: "h",
    TXT_Tensio: "230 V",
  });
  assert.equal(local.TXT_G, "g3) Auditori");
  for (const f of cieFields.filter((f) => f.condition?.values)) {
    assert.equal(cieFieldActive(f, {}), false);
    assert.equal(
      cieFieldActive(f, {
        [f.condition?.key || ""]: f.condition?.values?.[0] || "",
      }),
      true,
    );
  }
});
test("CIE admite borradores incompletos y cero; rechaza códigos postales, ramas y opciones incompatibles", () => {
  assert.deepEqual(
    normalizeCieFields({
      TXT_Potencia: "0",
      TXT_CodiPostal: "08001",
      RB_Subministrament: "NO",
    }),
    { TXT_Potencia: "0", TXT_CodiPostal: "08001", RB_Subministrament: "NO" },
  );
  assert.deepEqual(normalizeCieFields({}), {});
  for (const value of [
    { TXT_CodiPostal: "8001" },
    { TXT_CodiPostal: "ABCDE" },
    { TXT_CodiPostal: "123456" },
    { RB_TipusActuacio: "NOVA", TXT_CUPS: "ES..." },
    { TXT_G: "g3) Auditori" },
    {
      RB_Requisits: "P2",
      TXT_P1: cieFields.find((f) => f.key === "TXT_P1")?.choices?.[0].value,
    },
    { TXT_Us: "c" },
    { TXT_Tensio: "230 V", InfoTensioAltre: "400" },
    { TXT_Observacions: "x".repeat(1201) },
    { SignatureField1: "inventada" },
  ])
    assert.throws(() => normalizeCieFields(value));
});
test("el fondo CIE privado es idéntico al estático aprobado y los campos técnicos conservan unidades", async () => {
  assert.deepEqual(
    layout,
    JSON.parse(await readFile("tools/pdf-phase0/cie-layout.json", "utf8")),
  );
  const actual = await readFile("assets/pdf/cie.pdf");
  assert.deepEqual(
    actual,
    await readFile(
      "plantillas/Plta_ELEC1CertificatInstalElectricaBT-result.pdf",
    ),
  );
  assert.equal(
    createHash("sha256").update(actual).digest("hex"),
    layout.staticSourceSha256,
  );
  for (const k of ["TXT_AillamentTerra", "TXT_ResistenciaConductors"])
    assert.ok(
      cieFields.find((f) => f.key === k)?.label.every((l) => l.includes("MΩ")),
    );
  assert.ok(
    cieFields
      .find((f) => f.key === "TXT_Interruptor")
      ?.label.every((l) => l.includes("IGA")),
  );
});
test("el contrato SQL CIE coincide con las restricciones de entrada de los 70 campos", async () => {
  const sql = await readFile("infra/supabase/003-cie.sql", "utf8");
  const raw = /rules:='(.*?)'::jsonb/s.exec(sql)?.[1];
  assert.ok(raw);
  const rules = JSON.parse(raw.replaceAll("''", "'"));
  for (const f of cieFields) {
    assert.equal(rules[f.key].max, f.max);
    assert.equal(rules[f.key].type, "string");
    assert.deepEqual(
      rules[f.key].choices,
      f.choices?.map((c) => c.value),
    );
    assert.deepEqual(rules[f.key].condition, f.condition);
    assert.equal(rules[f.key].postal, f.postal);
  }
});
