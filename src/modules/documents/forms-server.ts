import { AccessError } from "../auth/security.ts";
import { type FormField, normalizeFields } from "./brie-schema.ts";
export function formPayload(
  body: Record<string, unknown>,
  schema: FormField[],
) {
  if (
    Object.keys(body).some((k) => !["fields", "revision"].includes(k)) ||
    !Number.isSafeInteger(body.revision) ||
    Number(body.revision) < 0
  )
    throw new AccessError(400, "input");
  try {
    return {
      fields: normalizeFields(body.fields, schema),
      revision: Number(body.revision),
    };
  } catch {
    throw new AccessError(400, "input");
  }
}
export function rpcFailure(error: { code?: string; message?: string }) {
  const key = error.message;
  if (error.code === "PT410") throw new AccessError(410, "expired");
  if (error.code === "PT409") throw new AccessError(409, "conflict");
  if (key === "not_found") throw new AccessError(404, "not_found");
  if (key === "closed") throw new AccessError(409, "closed");
  if (error.code === "22023") throw new AccessError(400, "input");
  throw new AccessError(503, "unavailable");
}
