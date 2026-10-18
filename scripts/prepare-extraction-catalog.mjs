import { writeFile } from "node:fs/promises";
import { brieFields } from "../src/modules/documents/brie-schema.ts";
import { cieFields } from "../src/modules/documents/cie-schema.ts";

const allowed = (f) =>
  !/^defecte_|^certificat_|^empresa_|^installador_/.test(f.key) &&
  !["professional", "certification", "defects"].includes(f.section);
await writeFile(
  "shared/extraction/catalog.json",
  `${JSON.stringify(
    { BRIE: brieFields.filter(allowed), CIE: cieFields.filter(allowed) },
    null,
    2,
  )}\n`,
);
