import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import type { AuthContext } from "../src/modules/auth/server.ts";
import { reviewToken, verifyReview } from "../src/modules/credits/review.ts";
import { verifiedPdf } from "../src/modules/credits/server.ts";

process.env.AUTH_PROOF_SECRET = "f".repeat(64);
const review = {
  owner: "11111111-1111-4111-8111-111111111111",
  session: "22222222-2222-4222-8222-222222222222",
  document: "33333333-3333-4333-8333-333333333333",
  revision: 7,
  sha256: "a".repeat(64),
};
test("el comprobante vincula usuario, sesión, documento, revisión y PDF por 30 minutos", () => {
  const now = 1800000000000;
  assert.deepEqual(verifyReview(reviewToken(review, now)), {
    ...review,
    expires: 1800001800,
  });
});
test("modificar cualquier contenido o firma del comprobante invalida la revisión", () => {
  const token = reviewToken(review);
  const [payload, sig] = token.split(".");
  for (const [key, value] of Object.entries({
    ...review,
    revision: 8,
    expires: 1,
  })) {
    const tampered = JSON.parse(Buffer.from(payload, "base64url").toString());
    tampered[key] =
      key === "revision" ? value : key === "expires" ? 1 : "altered";
    assert.throws(() =>
      verifyReview(
        `${Buffer.from(JSON.stringify(tampered)).toString("base64url")}.${sig}`,
      ),
    );
  }
  assert.throws(() => verifyReview(`${token}.extra`));
  assert.throws(() => verifyReview(`${payload}.${"0".repeat(64)}`));
  assert.throws(() => verifyReview(undefined));
  assert.throws(() => verifyReview("x".repeat(2049)));
});

test("el cobro exige bytes íntegros, dos páginas y ausencia de formulario interactivo", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.addPage();
  const bytes = await pdf.save();
  const sha = createHash("sha256").update(bytes).digest("hex");
  const ctx = {
    client: {
      storage: {
        from: () => ({
          download: async () => ({
            data: new Blob([new Uint8Array(bytes)]),
            error: null,
          }),
        }),
      },
    },
  } as unknown as AuthContext;
  assert.deepEqual(
    new Uint8Array(await verifiedPdf(ctx, "ficticio.pdf", sha)),
    bytes,
  );
  await assert.rejects(() => verifiedPdf(ctx, "ficticio.pdf", "0".repeat(64)));
  // Even an empty AcroForm is not an accepted static final PDF.
  pdf.getForm();
  const interactive = await pdf.save();
  const other = {
    client: {
      storage: {
        from: () => ({
          download: async () => ({
            data: new Blob([new Uint8Array(interactive)]),
            error: null,
          }),
        }),
      },
    },
  } as unknown as AuthContext;
  await assert.rejects(() =>
    verifiedPdf(
      other,
      "ficticio.pdf",
      createHash("sha256").update(interactive).digest("hex"),
    ),
  );
});
