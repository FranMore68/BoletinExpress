import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
// @ts-expect-error The worker is plain JavaScript and uses no frontend runtime.
import { deliverDocument } from "../worker/mail.mjs";

const bytes = Buffer.from("%PDF-ficticio");
const task = {
  id: "job-ficticio",
  document_id: "doc-ficticio",
  recipient: "evaluation@example.invalid",
  locale: "ca",
  sha256: createHash("sha256").update(bytes).digest("hex"),
};
test("Resend usa adjunto íntegro, destinatario fijado y la misma clave en reintentos", async () => {
  const requests: { url: string; init: RequestInit }[] = [];
  const send = async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return Response.json({ id: "accepted-ficticio" });
  };
  for (let i = 0; i < 2; i++)
    await deliverDocument(
      task,
      bytes,
      {
        MAIL_TRANSPORT: "resend",
        MAIL_FROM: "evaluation@example.invalid",
        RESEND_API_KEY: "fixture-only",
      },
      send,
    );
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.deepEqual(requests[0], requests[1]);
  const payload = JSON.parse(String(requests[0].init.body));
  assert.deepEqual(payload.to, [task.recipient]);
  assert.match(payload.subject, /còpia/);
  assert.ok(
    Buffer.from(payload.attachments[0].content, "base64").equals(bytes),
  );
  assert.equal(
    (requests[0].init.headers as Record<string, string>)["Idempotency-Key"],
    "document/job-ficticio",
  );
});
test("un hash incorrecto o configuración incompleta impiden el envío", async () => {
  let called = false;
  const send = async () => {
    called = true;
    return Response.json({});
  };
  await assert.rejects(
    deliverDocument(task, Buffer.from("alterado"), {}, send),
    /pdf_integrity/,
  );
  await assert.rejects(
    deliverDocument(task, bytes, { MAIL_TRANSPORT: "resend" }, send),
    /configuration/,
  );
  await assert.rejects(
    deliverDocument(
      { ...task, recipient: "real@example.com" },
      bytes,
      { MAIL_TRANSPORT: "mailpit", MAILPIT_URL: "https://external.invalid" },
      send,
    ),
    /configuration/,
  );
  assert.equal(called, false);
});
