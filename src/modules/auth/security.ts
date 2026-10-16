import { createHmac, timingSafeEqual } from "node:crypto";
export class AccessError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function appOrigin() {
  const url = new URL(process.env.APP_URL || "http://127.0.0.1:3000");
  if (
    url.origin !== url.href.replace(/\/$/, "") ||
    (url.protocol !== "https:" &&
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
  )
    throw new Error("Invalid APP_URL");
  return url.origin;
}
export function checkMutation(request: Request) {
  if (
    request.headers.get("origin") !== appOrigin() ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AccessError(403, "origin");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AccessError(415, "format");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "input");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 8192) {
      await reader.cancel();
      throw new AccessError(413, "size");
    }
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("invalid");
    return value as Record<string, unknown>;
  } catch {
    throw new AccessError(400, "input");
  }
}
export function stringValue(
  body: Record<string, unknown>,
  key: string,
  max = 254,
) {
  const v = body[key];
  if (typeof v !== "string" || !v.length || v.length > max)
    throw new AccessError(400, "input");
  return v;
}
export function emailValue(body: Record<string, unknown>) {
  const v = stringValue(body, "email").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    throw new AccessError(400, "input");
  return v;
}
export function passwordValue(body: Record<string, unknown>) {
  const v = stringValue(body, "password", 128);
  if (v.length < 12) throw new AccessError(400, "password");
  return v;
}
export function uuid(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new AccessError(404, "not_found");
  return value;
}
function proofSecret() {
  const s = process.env.AUTH_PROOF_SECRET;
  if (!s || s.length < 64) throw new AccessError(503, "unavailable");
  return s;
}
export function hashAttempt(value: string) {
  return createHmac("sha256", proofSecret()).update(value).digest("hex");
}
export function recoveryProof(userId: string, sessionId: string) {
  return hashAttempt(`recovery:${userId}:${sessionId}`);
}
export function sameProof(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
