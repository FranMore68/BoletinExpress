import { type NextRequest, NextResponse } from "next/server";
import { AccessError } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { verifiedPdf } from "@/modules/credits/server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    if (doc.status !== "validated") throw new AccessError(404, "not_found");
    const { data, error } = await ctx.client
      .from("validated_documents")
      .select("object_path,sha256,validated_at")
      .eq("document_id", doc.id)
      .maybeSingle();
    if (error) throw new AccessError(503, "unavailable");
    if (!data || Date.parse(data.validated_at) <= Date.now() - 30 * 86400000)
      throw new AccessError(404, "not_found");
    const bytes = await verifiedPdf(ctx, data.object_path, data.sha256);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${request.nextUrl.searchParams.get("view") === "1" ? "inline" : "attachment"}; filename="${doc.type}_${doc.id}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  });
}
