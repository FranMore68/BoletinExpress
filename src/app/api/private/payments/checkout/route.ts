import { type NextRequest, NextResponse } from "next/server";
import {
  AccessError,
  appOrigin,
  checkMutation,
  jsonBody,
  uuid,
} from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { sessionId } from "@/modules/credits/server";
import { paymentRpc } from "@/modules/payments/server";
import {
  checkoutParameters,
  checkoutUrl,
  packKey,
  stripeKey,
  stripeRequest,
} from "@/modules/payments/stripe";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return api(request, async (ctx) => {
    checkMutation(request);
    const user = await requireUser(ctx);
    const body = await jsonBody(request);
    const pack = packKey(body.pack);
    if (
      typeof body.requestId !== "string" ||
      !["es", "ca"].includes(String(body.locale))
    )
      throw new AccessError(400, "input");
    stripeKey();
    if (
      !process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") ||
      process.env.STRIPE_WEBHOOK_SECRET.length < 20
    )
      throw new AccessError(503, "payments_unavailable");
    const order = await paymentRpc("begin_checkout", {
      p_owner: user.id,
      p_session: await sessionId(ctx),
      p_request: uuid(body.requestId),
      p_pack: pack,
      p_locale: body.locale,
    });
    if (order.status === "paid") return NextResponse.json({ paid: true });
    if (order.status === "expired" || order.status === "failed")
      throw new AccessError(409, "conflict");
    const session = order.stripe_session
      ? await stripeRequest(
          `checkout/sessions/${encodeURIComponent(order.stripe_session)}`,
        )
      : await stripeRequest(
          "checkout/sessions",
          checkoutParameters(order, appOrigin(), order.locale),
          `checkout/${order.id}`,
        );
    if (
      session.livemode !== false ||
      !/^cs_test_[A-Za-z0-9]+$/.test(session.id) ||
      session.client_reference_id !== order.id
    )
      throw new AccessError(503, "payments_unavailable");
    // A completed payment is still credited exclusively by the webhook.
    if (session.status !== "open") return NextResponse.json({ pending: true });
    const url = checkoutUrl(session.url);
    await paymentRpc("bind_checkout", {
      p_order: order.id,
      p_checkout: session.id,
    });
    return NextResponse.json({ url });
  });
}
