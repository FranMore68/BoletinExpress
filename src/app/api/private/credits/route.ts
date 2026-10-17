import { type NextRequest, NextResponse } from "next/server";
import { AccessError } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const [account, movements] = await Promise.all([
      ctx.client.from("credit_accounts").select("balance").single(),
      ctx.client
        .from("credit_movements")
        .select("id,amount,balance_after,kind,document_id,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (account.error || movements.error)
      throw new AccessError(503, "unavailable");
    return NextResponse.json({
      balance: account.data.balance,
      movements: movements.data,
    });
  });
}
