import { AccessError } from "../auth/security.ts";

export async function paymentRpc(name: string, body: Record<string, unknown>) {
  const key = process.env.PAYMENTS_API_KEY;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!key || !anon) throw new AccessError(503, "payments_unavailable");
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    const codes: Record<string, number> = {
      session: 401,
      not_found: 404,
      conflict: 409,
      rate: 429,
      payment_mismatch: 400,
    };
    throw new AccessError(
      codes[data.message] || 503,
      codes[data.message] ? data.message : "payments_unavailable",
    );
  }
  return data;
}
