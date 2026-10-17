import { type NextRequest, NextResponse } from "next/server";
import { AccessError, checkMutation, jsonBody } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { brieFields } from "@/modules/documents/brie-schema";
import { cieFields, cieIssues } from "@/modules/documents/cie-schema";
import { formPayload, rpcFailure } from "@/modules/documents/forms-server";
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
    const { fields, revision } = formPayload(
      await jsonBody(request, 16384),
      doc.type === "CIE" ? cieFields : brieFields,
    );
    if (doc.type === "CIE" && cieIssues(fields).length)
      throw new AccessError(400, "input");
    const { data, error } = await ctx.client
      .rpc(doc.type === "CIE" ? "save_cie" : "save_brie", {
        p_document: doc.id,
        p_fields: fields,
        p_revision: revision,
      })
      .single();
    if (error) rpcFailure(error);
    return NextResponse.json({ document: data });
  });
}
