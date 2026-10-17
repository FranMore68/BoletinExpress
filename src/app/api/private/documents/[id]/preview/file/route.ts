import { type NextRequest, NextResponse } from "next/server";
import { AccessError } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    if (
      doc.status !== "draft" ||
      request.nextUrl.searchParams.get("revision") !== String(doc.revision)
    )
      throw new AccessError(404, "not_found");
    const { data, error } = await ctx.client
      .from("document_previews")
      .select("object_path")
      .eq("document_id", doc.id)
      .eq("revision", doc.revision)
      .eq("status", "ready")
      .maybeSingle();
    if (error) throw new AccessError(503, "unavailable");
    if (!data) throw new AccessError(404, "not_found");
    const file = await ctx.client.storage
      .from("previews")
      .download(data.object_path);
    if (file.error || !file.data) throw new AccessError(404, "not_found");
    // Recheck after the download in case another tab saved a new revision.
    const latest = await ownedDocument(ctx, doc.id);
    if (latest.revision !== doc.revision || latest.status !== "draft")
      throw new AccessError(404, "not_found");
    return new NextResponse(await file.data.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.type}_borrador_revision_${doc.revision}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  });
}
