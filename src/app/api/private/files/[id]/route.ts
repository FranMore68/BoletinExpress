import { type NextRequest, NextResponse } from "next/server";
import { AccessError, uuid } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const id = uuid((await params).id);
    const { data: file, error } = await ctx.client
      .from("document_files")
      .select("id,document_id,object_path")
      .eq("id", id)
      .eq("ready", true)
      .maybeSingle();
    if (error) throw new AccessError(503, "unavailable");
    if (!file) throw new AccessError(404, "not_found");
    const doc = await ownedDocument(ctx, file.document_id);
    if (doc.status !== "draft") throw new AccessError(403, "closed");
    const download = await ctx.client.storage
      .from("documents")
      .download(file.object_path);
    if (download.error || !download.data)
      throw new AccessError(404, "not_found");
    const view = request.nextUrl.searchParams.get("view") === "1";
    return new NextResponse(download.data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${view ? "inline" : "attachment"}; filename="BoletinExpress-${id}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "sandbox; default-src 'none'; frame-ancestors 'none'",
      },
    });
  });
}
