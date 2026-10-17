import { AccessError, hashAttempt, sameProof, uuid } from "../auth/security.ts";
export type Review = {
  owner: string;
  session: string;
  document: string;
  revision: number;
  sha256: string;
  expires: number;
};
export function reviewToken(review: Omit<Review, "expires">, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ ...review, expires: Math.floor(now / 1000) + 1800 }),
  ).toString("base64url");
  return `${payload}.${hashAttempt(`pdf-review:v1:${payload}`)}`;
}
export function verifyReview(token: unknown): Review {
  try {
    if (typeof token !== "string" || token.length > 2048) throw Error();
    const parts = token.split(".");
    const [payload, signature] = parts;
    if (
      parts.length !== 2 ||
      !/^[a-f0-9]{64}$/.test(signature) ||
      !sameProof(signature, hashAttempt(`pdf-review:v1:${payload}`))
    )
      throw Error();
    const r = JSON.parse(Buffer.from(payload, "base64url").toString());
    uuid(r.owner);
    uuid(r.session);
    uuid(r.document);
    if (
      !Number.isSafeInteger(r.revision) ||
      r.revision < 0 ||
      !Number.isSafeInteger(r.expires) ||
      !/^[a-f0-9]{64}$/.test(r.sha256)
    )
      throw Error();
    return r;
  } catch {
    throw new AccessError(409, "review_invalid");
  }
}
