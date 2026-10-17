import assert from "node:assert/strict";
import test from "node:test";
import { reviewToken, verifyReview } from "../src/modules/credits/review.ts";

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
