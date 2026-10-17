import { type NextRequest, NextResponse } from "next/server";
import { AccessError, checkMutation, jsonBody } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { verifyReview } from "@/modules/credits/review";
import { sessionId, validateRpc, verifiedPdf } from "@/modules/credits/server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    checkMutation(request);
    const user = await requireUser(ctx);
    const body = await jsonBody(request, 4096);
    if (Object.keys(body).some((k) => k !== "reviewToken"))
      throw new AccessError(400, "input");
    const review = verifyReview(body.reviewToken);
    const session = await sessionId(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    if (
      review.owner !== user.id ||
      review.session !== session ||
      review.document !== doc.id
    )
      throw new AccessError(409, "review_invalid");
    if (review.revision !== doc.revision)
      throw new AccessError(409, "conflict");
    if (doc.status !== "validated") {
      if (review.expires <= Math.floor(Date.now() / 1000))
        throw new AccessError(409, "review_expired");
      const { data, error } = await ctx.client
        .from("document_previews")
        .select("object_path,sha256")
        .eq("document_id", doc.id)
        .eq("revision", review.revision)
        .eq("status", "ready")
        .maybeSingle();
      if (error) throw new AccessError(503, "unavailable");
      if (!data || data.sha256 !== review.sha256)
        throw new AccessError(409, "pdf_not_ready");
      await verifiedPdf(ctx, data.object_path, review.sha256);
    }
    return NextResponse.json(
      await validateRpc({
        p_owner: user.id,
        p_session: session,
        p_document: doc.id,
        p_revision: review.revision,
        p_sha: review.sha256,
      }),
    );
  });
}
