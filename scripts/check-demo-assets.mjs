import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const origin = new URL(process.env.DEMO_ORIGIN || "http://127.0.0.1:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname));
const assets = [
  ["BRIE-ejemplo.pdf", "output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf"],
  [
    "CIE-ejemplo.pdf",
    "output/pdf/phase-0/cie-variantes/CIE-auditori_ref-PRUEBA.pdf",
  ],
  ["BRIE-1.png", "evidence/phase-0/brie-filled-poppler-1.png"],
  ["BRIE-2.png", "evidence/phase-0/brie-filled-poppler-2.png"],
  ["CIE-1.png", "evidence/phase-0/cie-static-auditori_ref-poppler-1.png"],
  ["CIE-2.png", "evidence/phase-0/cie-static-auditori_ref-poppler-2.png"],
];
const results = [];
for (const [file, source] of assets) {
  const response = await fetch(new URL(`/demo/${file}`, origin));
  assert.equal(response.status, 200, file);
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(new URL(`../${source}`, import.meta.url));
  assert.deepEqual(actual, expected, file);
  results.push({
    file,
    bytes: actual.length,
    sha256: createHash("sha256").update(actual).digest("hex"),
    pass: true,
  });
}
console.log(
  JSON.stringify(
    { pass: true, fixedFictitiousAssetsOnly: true, results },
    null,
    2,
  ),
);
