import { createHash } from "node:crypto";

export function mailPayload(task, bytes, from) {
  const ca = task.locale === "ca";
  return {
    from,
    to: [task.recipient],
    subject: ca
      ? "BoletinExpress · còpia del document"
      : "BoletinExpress · copia del documento",
    text: ca
      ? "Adjunt trobaràs el PDF validat. L’accés directe finalitza als 30 dies; pots demanar-ne el reenviament des del compte fins al dia 60. Després s’elimina de BoletinExpress. La còpia del teu correu es conserva segons la configuració de la teva bústia."
      : "Adjunto encontrarás el PDF validado. El acceso directo termina a los 30 días; puedes solicitar su reenvío desde la cuenta hasta el día 60. Después se elimina de BoletinExpress. La copia de tu correo se conserva según la configuración de tu buzón.",
    attachments: [
      {
        filename: `BoletinExpress_${task.document_id}.pdf`,
        content: Buffer.from(bytes).toString("base64"),
      },
    ],
  };
}
export async function deliverDocument(
  task,
  bytes,
  config = process.env,
  send = fetch,
) {
  if (createHash("sha256").update(bytes).digest("hex") !== task.sha256)
    throw Error("pdf_integrity");
  const transport =
    config.MAIL_TRANSPORT || (config.MAILPIT_URL ? "mailpit" : "");
  const from = config.MAIL_FROM || "no-reply@boletinexpress.invalid";
  const payload = mailPayload(task, bytes, from);
  let response;
  if (transport === "resend") {
    if (!config.RESEND_API_KEY || !config.MAIL_FROM)
      throw Error("configuration");
    response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `document/${task.id}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } else if (transport === "mailpit") {
    const url = new URL(config.MAILPIT_URL);
    if (!["mail", "127.0.0.1", "localhost"].includes(url.hostname))
      throw Error("configuration");
    response = await send(new URL("/api/v1/send", url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: from },
        To: [{ Email: task.recipient }],
        Subject: payload.subject,
        Text: payload.text,
        Headers: { "Message-ID": `<${task.id}@boletinexpress.invalid>` },
        Attachments: [
          {
            Filename: payload.attachments[0].filename,
            ContentType: "application/pdf",
            Content: payload.attachments[0].content,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
  } else throw Error("configuration");
  if (!response.ok) throw Error("transport");
  const result = await response.json();
  return String(result.id || result.ID || "accepted");
}
