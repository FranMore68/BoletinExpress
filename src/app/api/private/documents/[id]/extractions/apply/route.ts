import { type NextRequest, NextResponse } from "next/server";
import {
  AccessError,
  checkMutation,
  jsonBody,
  uuid,
} from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { rpcFailure } from "@/modules/documents/forms-server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    checkMutation(request);
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    const body = await jsonBody(request, 4096);
    if (
      Object.keys(body).some(
        (k) => !["jobId", "keys", "revision"].includes(k),
      ) ||
      !Number.isSafeInteger(body.revision) ||
      !Array.isArray(body.keys) ||
      body.keys.length < 1 ||
      body.keys.length > 80 ||
      body.keys.some((k) => typeof k !== "string")
    )
      throw new AccessError(400, "input");
    const id = uuid(String(body.jobId));
    const { data: job } = await ctx.client
      .from("document_extractions")
      .select("id")
      .eq("id", id)
      .eq("document_id", doc.id)
      .maybeSingle();
    if (!job) throw new AccessError(404, "not_found");
    const r = await ctx.client
      .rpc("apply_extraction", {
        p_job: id,
        p_revision: body.revision,
        p_keys: body.keys,
      })
      .single();
    if (r.error) rpcFailure(r.error);
    return NextResponse.json({ document: r.data });
  });
}
