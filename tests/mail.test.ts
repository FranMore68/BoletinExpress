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
      { ...task, recipient: "recipient@unit.example" },
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
  assert.deepEqual(payload.to, ["recipient@unit.example"]);
  assert.match(payload.subject, /còpia/);
  assert.ok(
    Buffer.from(payload.attachments[0].content, "base64").equals(bytes),
  );
  assert.equal(
    (requests[0].init.headers as Record<string, string>)["Idempotency-Key"],
    "document/job-ficticio",
  );
});
test("cuentas .invalid permanecen en Mailpit con Resend activo y sin credenciales externas en la petición", async () => {
  let calls = 0;
  const send = async (url: URL, init: RequestInit) => {
    calls++;
    assert.equal(String(url), "http://mail:8025/api/v1/send");
    assert.deepEqual(init.headers, { "Content-Type": "application/json" });
    const body = JSON.parse(String(init.body));
    assert.equal(body.To[0].Email, task.recipient);
    assert.deepEqual(body.From, {
      Email: "boletinexpress@unit.example",
      Name: "BoletinExpress",
    });
    return Response.json({ ID: "local-only" });
  };
  const config = {
    APP_ENV: "evaluation",
    MAIL_TRANSPORT: "resend",
    MAILPIT_URL: "http://mail:8025",
    MAIL_FROM: "BoletinExpress <boletinexpress@unit.example>",
    RESEND_API_KEY: "fixture-only",
  };
  assert.equal(await deliverDocument(task, bytes, config, send), "local-only");
  assert.equal(calls, 1);
  for (const change of [
    { APP_ENV: "production" },
    { MAILPIT_URL: "" },
    { MAILPIT_URL: "http://outside.invalid" },
    { MAILPIT_URL: "http://user:pass@mail:8025" },
  ])
    await assert.rejects(
      deliverDocument(task, bytes, { ...config, ...change }, send),
      /configuration/,
    );
  assert.equal(calls, 1);
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
