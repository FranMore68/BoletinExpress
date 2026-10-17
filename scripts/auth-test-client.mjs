import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const envFile = process.env.AUTH_TEST_ENV || ".secrets/app.env";
export const env = Object.fromEntries(
  (await readFile(envFile, "utf8"))
    .trim()
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
export const origin = env.APP_URL;
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(origin).hostname),
  "Solo evaluación local",
);
export class BrowserSession {
  cookies = new Map();
  async request(
    path,
    { method = "GET", body, headers = {}, originHeader = origin } = {},
  ) {
    const res = await fetch(new URL(path, origin), {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
      headers: {
        Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...(method === "GET" ? {} : { Origin: originHeader }),
        ...(body && !(body instanceof Buffer)
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body: body
        ? body instanceof Buffer
          ? body
          : JSON.stringify(body)
        : undefined,
    });
    for (const cookie of res.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const i = pair.indexOf("=");
      if (/max-age=0(?:;|$)/i.test(cookie))
        this.cookies.delete(pair.slice(0, i));
      else this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return res;
  }
}
export async function json(res, status) {
  if (res.status !== status) {
    const body = await res.json().catch(() => ({}));
    assert.equal(
      res.status,
      status,
      `${new URL(res.url).pathname}: ${body.error || "respuesta inesperada"}`,
    );
  }
  return res.json();
}
const mailbox = process.env.AUTH_TEST_MAILBOX || "http://127.0.0.1:54324";
export async function emailToken(email, type, previousMessages = []) {
  for (let i = 0; i < 150; i++) {
    const list = await fetch(
      `${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    ).then((r) => r.json());
    for (const message of list.messages || []) {
      if (previousMessages.includes(message.ID)) continue;
      const detail = await fetch(
        `${mailbox}/api/v1/message/${message.ID}`,
      ).then((r) => r.json());
      const match = (detail.HTML || detail.Text || "")
        .replaceAll("&amp;", "&")
        .match(/https?:\/\/[^"<>\s]+\/auth\/confirm\?[^"<>\s]+/);
      if (match) {
        const url = new URL(match[0]);
        if (url.searchParams.get("type") === type)
          return url.searchParams.get("token_hash");
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("No llegó el enlace al buzón local");
}
