import { AccessError } from "../auth/security.ts";
export async function extractionRpc(
  name: string,
  body: Record<string, unknown>,
) {
  const key = process.env.EXTRACTION_API_KEY;
  if (!key || !process.env.SUPABASE_ANON_KEY)
    throw new AccessError(503, "ai_configuration");
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error("extraction_reservation_failed", {
      code: /^[A-Z0-9]{5,12}$/.test(data.code || "") ? data.code : "upstream",
    });
    const codes: Record<string, number> = {
      session: 401,
      not_found: 404,
      input: 400,
      conflict: 409,
      closed: 409,
      extraction_limit: 429,
    };
    throw new AccessError(
      codes[data.message] || 503,
      codes[data.message] ? data.message : "unavailable",
    );
  }
  return data;
}
export async function boundedBytes(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2097152) {
      await reader.cancel();
      throw new AccessError(413, "size");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
