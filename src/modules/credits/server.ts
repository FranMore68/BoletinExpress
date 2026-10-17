import { createHash } from "node:crypto";
import { PDFDocument, PDFName } from "pdf-lib";
import { AccessError, uuid } from "../auth/security.ts";
import type { AuthContext } from "../auth/server.ts";
export async function sessionId(ctx: AuthContext) {
  const { data } = await ctx.client.auth.getSession();
  if (!data.session) throw new AccessError(401, "session");
  try {
    return uuid(
      JSON.parse(
        Buffer.from(
          data.session.access_token.split(".")[1],
          "base64url",
        ).toString(),
      ).session_id,
    );
  } catch {
    throw new AccessError(401, "session");
  }
}
export async function verifiedPdf(ctx: AuthContext, path: string, sha: string) {
  const file = await ctx.client.storage.from("previews").download(path);
  if (file.error || !file.data) throw new AccessError(409, "pdf_not_ready");
  const bytes = await file.data.arrayBuffer();
  if (createHash("sha256").update(Buffer.from(bytes)).digest("hex") !== sha)
    throw new AccessError(409, "pdf_not_ready");
  try {
    const pdf = await PDFDocument.load(bytes);
    if (pdf.getPageCount() !== 2 || pdf.catalog.has(PDFName.of("AcroForm")))
      throw Error();
  } catch {
    throw new AccessError(409, "pdf_not_ready");
  }
  return bytes;
}
export async function validateRpc(body: Record<string, unknown>) {
  const key = process.env.CREDITS_API_KEY;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!key || !anon) throw new AccessError(503, "unavailable");
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/validate_document`,
    {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  const result = await response.json();
  if (!response.ok) {
    const known: Record<string, number> = {
      session: 401,
      not_found: 404,
      conflict: 409,
      pdf_not_ready: 409,
      insufficient_credits: 402,
    };
    throw new AccessError(
      known[result.message] || 503,
      known[result.message] ? result.message : "unavailable",
    );
  }
  // Object paths stay within the server and storage policies.
  const { object_path: _, ...artifact } = result.artifact;
  return { ...result, artifact };
}
