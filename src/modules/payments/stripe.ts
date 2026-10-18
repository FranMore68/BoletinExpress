import { createHmac, timingSafeEqual } from "node:crypto";
import { AccessError } from "../auth/security.ts";
import { testPacks } from "./packs.ts";

export const stripeVersion = "2026-09-30.endive";
export type PackKey = keyof typeof testPacks;
export type Purchase = {
  id: string;
  owner_id: string;
  pack: PackKey;
  amount_cents: number;
  credits: number;
  created_at: string;
  stripe_session: string | null;
  status: string;
};
export function packKey(value: unknown): PackKey {
  if (value !== "basic" && value !== "pro") throw new AccessError(400, "input");
  return value;
}
export function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  // This pilot cannot use a live key, even if deployment secrets are mistaken.
  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(key))
    throw new AccessError(503, "payments_unavailable");
  return key;
}
export function checkoutParameters(
  order: Purchase,
  origin: string,
  locale: string,
) {
  const params = new URLSearchParams({
    mode: "payment",
    "payment_method_types[0]": "card",
    client_reference_id: order.id,
    "metadata[order_id]": order.id,
    "metadata[owner_id]": order.owner_id,
    "metadata[pack]": order.pack,
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(order.amount_cents),
    "line_items[0][price_data][product_data][name]": `BoletinExpress · ${order.credits} KC · PRUEBA`,
    "line_items[0][quantity]": "1",
    // Stable parameters for retries, including language, persisted with the order.
    locale: "es",
    success_url: `${origin}/cuenta?lang=${locale}&payment=returned`,
    cancel_url: `${origin}/cuenta?lang=${locale}&payment=cancelled`,
    expires_at: String(Math.floor(Date.parse(order.created_at) / 1000) + 3600),
  });
  return params;
}
export async function stripeRequest(
  path: string,
  params?: URLSearchParams,
  idempotency?: string,
  send: typeof fetch = fetch,
) {
  const res = await send(`https://api.stripe.com/v1/${path}`, {
    method: params ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Stripe-Version": stripeVersion,
      ...(params
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
      ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
    },
    body: params,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) throw new AccessError(503, "payments_unavailable");
  return res.json();
}
export function checkoutUrl(value: unknown): string {
  try {
    const url = new URL(String(value));
    if (
      url.protocol === "https:" &&
      url.hostname === "checkout.stripe.com" &&
      !url.username &&
      !url.password &&
      !url.port
    )
      return url.href;
  } catch {}
  throw new AccessError(503, "payments_unavailable");
}
export function signedEvent(
  raw: Buffer,
  signature: string | null,
  secret: string,
  now = Date.now(),
) {
  if (!secret.startsWith("whsec_") || secret.length < 20)
    throw new AccessError(503, "payments_unavailable");
  if (!signature || signature.length > 2048)
    throw new AccessError(400, "signature");
  const parts = signature.split(",").map((p) => p.split("="));
  const timestamps = parts.filter(([k]) => k === "t");
  const timestamp = timestamps[0]?.[1] || "";
  if (
    timestamps.length !== 1 ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    throw new AccessError(400, "signature");
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(raw)
    .digest();
  if (
    !parts.some(
      ([k, v]) =>
        k === "v1" &&
        /^[a-f0-9]{64}$/.test(v || "") &&
        timingSafeEqual(digest, Buffer.from(v, "hex")),
    )
  )
    throw new AccessError(400, "signature");
  try {
    const event = JSON.parse(raw.toString("utf8"));
    if (
      event.object !== "event" ||
      !/^evt_[A-Za-z0-9]+$/.test(event.id) ||
      event.livemode !== false ||
      typeof event.type !== "string"
    )
      throw Error();
    return event;
  } catch {
    throw new AccessError(400, "input");
  }
}
export const paymentEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);
export type PaymentSession = {
  id: string;
  object: string;
  livemode: boolean;
  mode: string;
  currency: string;
  amount_total: number;
  amount_subtotal: number;
  client_reference_id: string;
  metadata?: { pack?: string; order_id?: string; owner_id?: string };
  payment_status: string;
  status: string;
  payment_intent: string | null;
  line_items?: {
    has_more: boolean;
    data: {
      quantity: number;
      price?: { unit_amount: number; currency: string };
    }[];
  };
};
export function paymentDetails(session: PaymentSession) {
  const pack = packKey(session.metadata?.pack);
  const expected = testPacks[pack];
  const line = session.line_items?.data?.[0];
  if (
    !/^cs_test_[A-Za-z0-9]+$/.test(session.id) ||
    session.object !== "checkout.session" ||
    session.livemode !== false ||
    session.mode !== "payment" ||
    session.currency !== "eur" ||
    session.amount_total !== expected.amountCents ||
    session.amount_subtotal !== expected.amountCents ||
    typeof session.metadata?.order_id !== "string" ||
    typeof session.metadata?.owner_id !== "string" ||
    session.client_reference_id !== session.metadata?.order_id ||
    session.line_items?.has_more !== false ||
    session.line_items.data.length !== 1 ||
    !line ||
    line.quantity !== 1 ||
    line.price?.unit_amount !== expected.amountCents ||
    line.price?.currency !== "eur" ||
    !["open", "complete", "expired"].includes(session.status) ||
    !["paid", "unpaid"].includes(session.payment_status) ||
    (session.payment_status === "paid" &&
      (session.status !== "complete" ||
        typeof session.payment_intent !== "string" ||
        !/^pi_[A-Za-z0-9]+$/.test(session.payment_intent)))
  )
    throw new AccessError(400, "payment_mismatch");
  return {
    p_order: session.metadata.order_id,
    p_owner: session.metadata.owner_id,
    p_pack: pack,
    p_checkout: session.id,
    p_payment:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    p_amount: session.amount_total,
    p_currency: session.currency,
    p_paid: session.payment_status === "paid",
    p_status: session.status,
  };
}
