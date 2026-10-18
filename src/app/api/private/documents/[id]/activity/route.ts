import { type NextRequest, NextResponse } from "next/server";
import {
  AccessError,
  checkMutation,
  jsonBody,
  uuid,
} from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    checkMutation(request);
    await requireUser(ctx);
    const id = uuid((await params).id);
    const body = await jsonBody(request);
    if (Object.keys(body).some((k) => !([] as string[]).includes(k)))
      throw new AccessError(400, "input");

    const { data, error } = await ctx.client.rpc("reopen_document", {
      p_document: id,
    });
    if (error) {
      const status =
        ({ PT404: 404, PT410: 410, PT429: 429 } as Record<string, number>)[
          error.code
        ] || 503;
      throw new AccessError(
        status,
        status === 404
          ? "not_found"
          : status === 410
            ? "expired"
            : status === 429
              ? "rate"
              : "unavailable",
      );
    }
    return NextResponse.json({ document: data }, { status: 200 });
  });
}
