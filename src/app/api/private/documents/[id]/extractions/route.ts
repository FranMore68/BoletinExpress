import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
  AccessError,
  checkMutation,
  jsonBody,
  uuid,
} from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { sessionId } from "@/modules/credits/server";
import { boundedBytes, extractionRpc } from "@/modules/extraction/server";
import { ownedDocument } from "@/modules/private-documents/server";
import { sourceMedia } from "../../../../../../../shared/extraction/media.mjs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    const { data, error } = await ctx.client
      .from("document_extractions")
      .select("id,kind,state,result,transcription,error,attempts,created_at")
      .eq("document_id", doc.id)
      .order("created_at", { ascending: false });
    if (error) throw new AccessError(503, "unavailable");
    return NextResponse.json({
      extractions: data,
      manualKeys: doc.manual_keys,
      available: !!process.env.EXTRACTION_API_KEY,
    });
  });
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    checkMutation(request);
    const user = await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    if (doc.status !== "draft") throw new AccessError(409, "closed");
    const mime = request.headers.get("content-type") || "";
    let bytes: Buffer,
      kind: string,
      seconds = 0,
      sourceText: string | null = null,
      requestId: string,
      mediaMime = mime;
    if (mime === "application/json") {
      const body = await jsonBody(request, 32000);
      if (body.retry) {
        if (Object.keys(body).length !== 1) throw new AccessError(400, "input");
        const job = uuid(String(body.retry));
        const { data: owned } = await ctx.client
          .from("document_extractions")
          .select("id")
          .eq("id", job)
          .eq("document_id", doc.id)
          .maybeSingle();
        if (!owned) throw new AccessError(404, "not_found");
        const r = await ctx.client.rpc("retry_extraction", { p_job: job });
        if (r.error || !r.data) throw new AccessError(409, "conflict");
        return NextResponse.json({ id: job });
      }
      if (
        Object.keys(body).some((k) => !["text", "requestId"].includes(k)) ||
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 6000
      )
        throw new AccessError(400, "input");
      sourceText = body.text;
      bytes = Buffer.from(sourceText);
      requestId = uuid(String(body.requestId));
      kind = "text";
      mediaMime = "text/plain";
    } else {
      requestId = uuid(request.headers.get("x-request-id") || "");
      bytes = await boundedBytes(request);
      try {
        const media = sourceMedia(bytes, mime);
        kind = media.kind;
        seconds = media.seconds;
      } catch (e) {
        throw new AccessError(400, e instanceof Error ? e.message : "format");
      }
    }
    const item = await extractionRpc("begin_extraction", {
      p_locale: request.nextUrl.searchParams.get("lang") === "ca" ? "ca" : "es",
      p_owner: user.id,
      p_session: await sessionId(ctx),
      p_document: doc.id,
      p_request: requestId,
      p_kind: kind,
      p_mime: mediaMime,
      p_sha: createHash("sha256").update(bytes).digest("hex"),
      p_text: sourceText,
      p_seconds: seconds,
    });
    if (item.state === "upload") {
      const r = await ctx.client.storage
        .from("sources")
        .upload(item.object_path, bytes, { contentType: mime, upsert: false });
      if (r.error) {
        const existing = await ctx.client.storage
          .from("sources")
          .download(item.object_path);
        if (
          existing.error ||
          !existing.data ||
          createHash("sha256")
            .update(Buffer.from(await existing.data.arrayBuffer()))
            .digest("hex") !== createHash("sha256").update(bytes).digest("hex")
        )
          throw new AccessError(503, "upload");
      }
      const finished = await ctx.client.rpc("finish_source_upload", {
        p_job: item.id,
      });
      if (finished.error || !finished.data)
        throw new AccessError(409, "closed");
    }
    return NextResponse.json({ id: item.id }, { status: 202 });
  });
}
