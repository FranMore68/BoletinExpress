import { type NextRequest, NextResponse } from "next/server";
import { AccessError } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { reviewToken } from "@/modules/credits/review";
import { sessionId, verifiedPdf } from "@/modules/credits/server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    const user = await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    if (
      doc.status !== "draft" ||
      request.nextUrl.searchParams.get("revision") !== String(doc.revision)
    )
      throw new AccessError(404, "not_found");
    const { data, error } = await ctx.client
      .from("document_previews")
      .select("object_path,sha256")
      .eq("document_id", doc.id)
      .eq("revision", doc.revision)
      .eq("status", "ready")
      .maybeSingle();
    if (error) throw new AccessError(503, "unavailable");
    if (!data) throw new AccessError(404, "not_found");
    const bytes = await verifiedPdf(ctx, data.object_path, data.sha256);
    // Recheck after the download in case another tab saved a new revision.
    const latest = await ownedDocument(ctx, doc.id);
    if (latest.revision !== doc.revision || latest.status !== "draft")
      throw new AccessError(404, "not_found");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "X-Boletin-Review": reviewToken({
          owner: user.id,
          session: await sessionId(ctx),
          document: doc.id,
          revision: doc.revision,
          sha256: data.sha256,
        }),
        "Content-Disposition": `inline; filename="${doc.type}_borrador_revision_${doc.revision}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  });
}
