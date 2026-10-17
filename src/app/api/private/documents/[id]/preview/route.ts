import { type NextRequest, NextResponse } from "next/server";
import { AccessError, checkMutation, jsonBody } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { rpcFailure } from "@/modules/documents/forms-server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    const { data, error } = await ctx.client
      .from("document_previews")
      .select("revision,status,error_fields,sha256")
      .eq("document_id", doc.id)
      .eq("revision", doc.revision)
      .maybeSingle();
    if (error) throw new AccessError(503, "unavailable");
    return NextResponse.json({ preview: data });
  });
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    checkMutation(request);
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    const body = await jsonBody(request);
    if (
      Object.keys(body).some((k) => !["revision", "retry"].includes(k)) ||
      !Number.isSafeInteger(body.revision) ||
      (body.retry !== undefined && typeof body.retry !== "boolean")
    )
      throw new AccessError(400, "input");
    const { data, error } = await ctx.client
      .rpc("request_brie_preview", {
        p_document: doc.id,
        p_revision: body.revision,
        p_retry: body.retry === true,
      })
      .single();
    if (error) rpcFailure(error);
    return NextResponse.json({ preview: data }, { status: 202 });
  });
}
