import { type NextRequest, NextResponse } from "next/server";
import { AccessError, checkMutation } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { ownedDocument, pdfBody } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    checkMutation(request);
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    if (doc.status !== "draft") throw new AccessError(409, "closed");
    const bytes = await pdfBody(request);
    const reservation = await ctx.client.rpc("reserve_file", {
      p_document: doc.id,
    });
    if (reservation.error)
      throw new AccessError(
        reservation.error.code === "23514" ? 409 : 404,
        "file_limit",
      );
    const file = reservation.data as { id: string; object_path: string };
    const upload = await ctx.client.storage
      .from("documents")
      .upload(file.object_path, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upload.error) {
      await ctx.client.rpc("cancel_file", { p_file: file.id });
      throw new AccessError(503, "upload");
    }
    const finish = await ctx.client.rpc("finish_file", { p_file: file.id });
    if (finish.error || finish.data !== true)
      throw new AccessError(503, "upload");
    return NextResponse.json({ file: { id: file.id } }, { status: 201 });
  });
}
