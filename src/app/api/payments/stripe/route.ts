import { type NextRequest, NextResponse } from "next/server";
import { AccessError, uuid } from "@/modules/auth/security";
import { failure } from "@/modules/auth/server";
import { paymentRpc } from "@/modules/payments/server";
import {
  paymentDetails,
  paymentEvents,
  signedEvent,
  stripeRequest,
} from "@/modules/payments/stripe";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new AccessError(400, "input");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        throw new AccessError(413, "size");
      }
      chunks.push(value);
    }
    const event = signedEvent(
      Buffer.concat(chunks),
      request.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
    if (!paymentEvents.has(event.type))
      return NextResponse.json({ received: true });
    const id = event.data?.object?.id;
    if (typeof id !== "string" || !/^cs_test_[A-Za-z0-9]+$/.test(id))
      throw new AccessError(400, "input");
    // Ignore client-supplied totals; retrieve the authoritative session after signature verification.
    const session = await stripeRequest(
      `checkout/sessions/${id}?expand[]=line_items`,
    );
    if (session.id !== id) throw new AccessError(400, "payment_mismatch");
    const details = paymentDetails(session);
    uuid(details.p_order);
    uuid(details.p_owner);
    await paymentRpc("apply_payment_event", {
      ...details,
      p_event: event.id,
      p_event_type: event.type,
    });
    return NextResponse.json(
      { received: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
