import { type NextRequest, NextResponse } from "next/server";
import { AccessError } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { stripeKey } from "@/modules/payments/stripe";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    let available = false;
    try {
      stripeKey();
      available = Boolean(
        process.env.PAYMENTS_API_KEY &&
          process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") &&
          process.env.STRIPE_WEBHOOK_SECRET.length >= 20,
      );
    } catch {}
    const purchases = await ctx.client
      .from("credit_purchases")
      .select("id,pack,amount_cents,credits,status,created_at,paid_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (purchases.error) throw new AccessError(503, "payments_unavailable");
    return NextResponse.json({ available, purchases: purchases.data });
  });
}
