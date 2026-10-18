import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import test from "node:test";
import type {
  PaymentSession,
  Purchase,
} from "../src/modules/payments/stripe.ts";
import {
  checkoutParameters,
  checkoutUrl,
  packKey,
  paymentDetails,
  signedEvent,
  stripeKey,
  stripeRequest,
  stripeVersion,
} from "../src/modules/payments/stripe.ts";

const secret = `whsec_${"f".repeat(30)}`;
const time = Date.now();
const timestamp = Math.floor(time / 1000);
const event = {
  id: "evt_fixture",
  object: "event",
  livemode: false,
  type: "checkout.session.completed",
};
const raw = Buffer.from(JSON.stringify(event));
function signature(bytes = raw, t = timestamp) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.`).update(bytes).digest("hex")}`;
}
test("Stripe signature: raw bytes, real clock, rotation and invalid signatures", () => {
  assert.equal(signedEvent(raw, signature(), secret, time).id, event.id);
  assert.equal(
    signedEvent(raw, `${signature()},v1=${"0".repeat(64)}`, secret, time).id,
    event.id,
  );
  for (const sig of [
    null,
    "",
    `t=${timestamp},v1=bad`,
    signature(raw, timestamp - 301),
    signature(raw, timestamp + 301),
    `${signature()},t=${timestamp}`,
  ])
    assert.throws(() => signedEvent(raw, sig, secret, time));
  assert.throws(() =>
    signedEvent(Buffer.from(`${raw} `), signature(), secret, time),
  );
  assert.throws(() => signedEvent(raw, signature(), "", time));
  const live = Buffer.from(JSON.stringify({ ...event, livemode: true }));
  assert.throws(() => signedEvent(live, signature(live), secret, time));
});
const order: Purchase = {
  id: randomUUID(),
  owner_id: randomUUID(),
  pack: "pro",
  amount_cents: 2000,
  credits: 25,
  created_at: new Date().toISOString(),
  stripe_session: null,
  status: "creating",
};
test("Checkout: immutable server prices, fixed return origin and approved Stripe host", () => {
  const params = checkoutParameters(order, "http://127.0.0.1:3000", "ca");
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "2000");
  assert.equal(params.get("line_items[0][quantity]"), "1");
  assert.equal(
    params.get("success_url"),
    "http://127.0.0.1:3000/cuenta?lang=ca&payment=returned",
  );
  assert.equal(
    checkoutUrl("https://checkout.stripe.com/c/pay/cs_test_example"),
    "https://checkout.stripe.com/c/pay/cs_test_example",
  );
  for (const url of [
    "http://checkout.stripe.com/",
    "https://checkout.stripe.com.evil.invalid/",
    "javascript:alert(1)",
    "https://user@checkout.stripe.com/",
  ])
    assert.throws(() => checkoutUrl(url));
  for (const pack of ["", null, "toString", "premium"])
    assert.throws(() => packKey(pack));
});
export const paidSession: PaymentSession = {
  id: "cs_test_fixture",
  object: "checkout.session",
  livemode: false,
  mode: "payment",
  currency: "eur",
  amount_total: 2000,
  amount_subtotal: 2000,
  client_reference_id: order.id,
  metadata: { order_id: order.id, owner_id: order.owner_id, pack: "pro" },
  payment_status: "paid",
  status: "complete",
  payment_intent: "pi_fixture",
  line_items: {
    has_more: false,
    data: [{ quantity: 1, price: { unit_amount: 2000, currency: "eur" } }],
  },
};
test("Payment retrieval: reject live sessions, wrong totals, products, quantities and missing payment", () => {
  assert.equal(paymentDetails(paidSession).p_paid, true);
  for (const change of [
    { livemode: true },
    { currency: "usd" },
    { amount_total: 1000 },
    { amount_subtotal: 1000 },
    { payment_intent: null },
    { status: "open" },
    { client_reference_id: randomUUID() },
    { mode: "subscription" },
    { line_items: { has_more: true, data: [] } },
    {
      line_items: {
        has_more: false,
        data: [{ quantity: 2, price: { unit_amount: 2000, currency: "eur" } }],
      },
    },
    { line_items: undefined },
    { metadata: { pack: "basic" } },
  ])
    assert.throws(() => paymentDetails({ ...paidSession, ...change }));
});
test("API transport: only test keys, pinned version, no redirect and idempotency", async () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  try {
    for (const key of ["", "sk_live_fixture", "rk_live_fixture"]) {
      process.env.STRIPE_SECRET_KEY = key;
      assert.throws(() => stripeKey());
    }
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
    const send: typeof fetch = async (url, options) => {
      assert.equal(String(url), "https://api.stripe.com/v1/checkout/sessions");
      assert.equal(options?.redirect, "error");
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers["Stripe-Version"], stripeVersion);
      assert.equal(headers["Idempotency-Key"], `checkout/${order.id}`);
      return Response.json({ id: "cs_test_fixture" });
    };
    assert.equal(
      (
        await stripeRequest(
          "checkout/sessions",
          checkoutParameters(order, "http://localhost:3000", "es"),
          `checkout/${order.id}`,
          send,
        )
      ).id,
      "cs_test_fixture",
    );
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
});
