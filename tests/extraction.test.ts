import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../shared/extraction/catalog.json" with { type: "json" };
import { sourceMedia } from "../shared/extraction/media.mjs";
import {
  extractionRequest,
  sanitizeResult,
} from "../shared/extraction/openai.mjs";
import { brieFields } from "../src/modules/documents/brie-schema.ts";
import { cieFields } from "../src/modules/documents/cie-schema.ts";
import { pcmWav } from "../src/modules/extraction/audio.ts";

test("duración de audio comprobada por bytes: rechaza 61 s, cabecera falsa, estéreo y archivo vacío", () => {
  const wav = Buffer.from(pcmWav(new Float32Array(16000 * 60)));
  assert.equal(sourceMedia(wav, "audio/wav").seconds, 60);
  assert.throws(
    () =>
      sourceMedia(
        Buffer.from(pcmWav(new Float32Array(16000 * 60 + 1))),
        "audio/wav",
      ),
    /audio_limit/,
  );
  const damaged = Buffer.from(wav);
  damaged.writeUInt16LE(2, 22);
  assert.throws(() => sourceMedia(damaged, "audio/wav"), /format/);
  assert.throws(() => sourceMedia(Buffer.alloc(0), "audio/wav"), /size/);
  const lying = Buffer.from(wav);
  lying.writeUInt32LE(20, 40);
  assert.throws(() => sourceMedia(lying, "audio/wav"), /format/);
});
test("propuestas: rechaza campos inventados, duplicados, tipos inválidos y conclusiones normativas", () => {
  assert.throws(
    () =>
      sanitizeResult("BRIE", {
        fields: [
          {
            key: "defecte_1",
            value: "false",
            evidence: "Todo OK",
            uncertain: false,
          },
        ],
        issues: [],
      }),
    /ai_output/,
  );
  assert.throws(
    () =>
      sanitizeResult("BRIE", {
        fields: [
          {
            key: "certificat_nom",
            value: "firma inventada",
            evidence: "OK",
            uncertain: false,
          },
        ],
        issues: [],
      }),
    /ai_output/,
  );
  const p = {
    key: "tensio_actual",
    value: "400",
    evidence: "Tension 400",
    uncertain: false,
  };
  assert.throws(
    () => sanitizeResult("BRIE", { fields: [p, p], issues: [] }),
    /ai_output/,
  );
  assert.deepEqual(
    sanitizeResult("BRIE", { fields: [p], issues: [] }).fields[0],
    p,
  );
  const unknown = { ...p, key: "not_a_field" };
  assert.throws(
    () => sanitizeResult("BRIE", { fields: [unknown], issues: [] }),
    /ai_output/,
  );
});
test("catálogos de IA derivados de los formularios aprobados y petición sin persistencia ni herramientas", () => {
  for (const [kind, fields] of [
    ["BRIE", brieFields],
    ["CIE", cieFields],
  ] as const) {
    assert.deepEqual(
      catalog[kind],
      fields.filter(
        (f) =>
          !/^defecte_|^certificat_|^empresa_|^installador_/.test(f.key) &&
          !["professional", "certification", "defects"].includes(f.section),
      ),
    );
    for (const f of catalog[kind])
      assert.ok(fields.some((s) => s.key === f.key));
    const request = extractionRequest(kind, "nota", null);
    assert.equal(request.store, false);
    assert.equal(request.model, "gpt-6-luna");
    assert.equal("tools" in request, false);
    assert.match(request.instructions, /Todo OK/);
  }
});

test("potencia sin unidad queda pendiente y Todo OK no se transforma en mediciones", () => {
  const proposal = {
    key: "potencia_maxima",
    value: "6'928",
    evidence: "MAX. 6'928",
    uncertain: false,
  };
  assert.equal(
    sanitizeResult("BRIE", { fields: [proposal], issues: [] }).fields[0]
      .uncertain,
    true,
  );
  assert.equal(
    sanitizeResult("BRIE", {
      fields: [{ ...proposal, evidence: "6,928 kW" }],
      issues: [],
    }).fields[0].uncertain,
    false,
  );
  assert.equal(
    sanitizeResult("BRIE", {
      fields: [{ ...proposal, evidence: "Todo OK" }],
      issues: [],
    }).fields.length,
    0,
  );
  assert.equal(
    sanitizeResult("BRIE", {
      fields: [
        {
          ...proposal,
          key: "resistencia_terra",
          value: "10",
          evidence: "«Todo OK»",
        },
      ],
      issues: [],
    }).fields.length,
    0,
  );
  assert.match(
    extractionRequest("BRIE", "nota", null, "ca").instructions,
    /catalán/,
  );
});
