import { type NextRequest, NextResponse } from "next/server";
import {
  AccessError,
  checkMutation,
  jsonBody,
  stringValue,
} from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const { data, error } = await ctx.client
      .from("documents")
      .select(
        "id,type,title,status,created_at,validated_at,draft_expires_at,renewal_active",
      )
      .order("created_at", { ascending: false });
    if (error) throw new AccessError(503, "unavailable");
    return NextResponse.json({ documents: data });
  });
}
export async function POST(request: NextRequest) {
  return api(request, async (ctx) => {
    checkMutation(request);
    await requireUser(ctx);
    const body = await jsonBody(request);
    if (Object.keys(body).some((k) => !["type", "title"].includes(k)))
      throw new AccessError(400, "input");
    const type = stringValue(body, "type", 4);
    const title = stringValue(body, "title", 100).trim();
    if (!["BRIE", "CIE"].includes(type) || !title)
      throw new AccessError(400, "input");
    const { data, error } = await ctx.client
      .rpc("create_document", { p_type: type, p_title: title })
      .single();
    if (error)
      throw new AccessError(
        error.code === "23514" ? 409 : 503,
        error.message.includes("draft_limit") ? "draft_limit" : "unavailable",
      );
    return NextResponse.json({ document: data }, { status: 201 });
  });
}
