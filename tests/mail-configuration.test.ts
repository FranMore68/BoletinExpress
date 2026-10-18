import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

test("activación de Resend reversible, secretos privados, TLS y bloqueo de cuentas ficticias", async () => {
  const dir = await mkdtemp(`${tmpdir()}/boletin-mail-config-`);
  const script = resolve("scripts/configure-resend.mjs");
  const run = (mode: string) =>
    execFileSync(process.execPath, [script, mode], { cwd: dir, stdio: "pipe" });
  try {
    await mkdir(`${dir}/.secrets`, { mode: 0o700 });
    await writeFile(
      `${dir}/.secrets/mail.env`,
      "MAIL_TRANSPORT=mailpit\nMAIL_FROM=BoletinExpress <boletinexpress@unit.example>\nRESEND_API_KEY=re_fixture\n",
      { mode: 0o600 },
    );
    await writeFile(
      `${dir}/.secrets/supabase.env`,
      "APP_URL=http://127.0.0.1:3000\nUNCHANGED=value\n",
      { mode: 0o600 },
    );
    run("enable");
    run("enable");
    const relay = await readFile(`${dir}/.secrets/auth-mail.env`, "utf8");
    assert.match(relay, /MP_SMTP_RELAY_TLS=true/);
    assert.match(relay, /MP_SMTP_RELAY_ALLOW_INSECURE=false/);
    assert.match(relay, /MP_SMTP_RELAY_FWD_SMTP_ERRORS=true/);
    assert.match(
      relay,
      /MP_SMTP_RELAY_BLOCKED_RECIPIENTS='\(\?i\)@\(\[\^@\]\*\\\.\)\?invalid\$'/,
    );
    assert.equal(
      (await stat(`${dir}/.secrets/auth-mail.env`)).mode & 0o777,
      0o600,
    );
    assert.match(
      await readFile(`${dir}/.secrets/mail.env`, "utf8"),
      /MAIL_TRANSPORT=resend/,
    );
    const root = await readFile(`${dir}/.secrets/supabase.env`, "utf8");
    assert.match(root, /SMTP_FROM=boletinexpress@unit.example/);
    assert.match(root, /UNCHANGED=value/);
    assert.ok(!root.includes("re_fixture"));
    run("disable");
    assert.equal(
      await readFile(`${dir}/.secrets/supabase.env`, "utf8"),
      "APP_URL=http://127.0.0.1:3000\nUNCHANGED=value\n",
    );
    await assert.rejects(stat(`${dir}/.secrets/auth-mail.env`));
    assert.match(
      await readFile(`${dir}/.secrets/mail.env`, "utf8"),
      /MAIL_TRANSPORT=mailpit/,
    );
    await writeFile(
      `${dir}/.secrets/supabase.env`,
      "SMTP_HOST=custom.example\n",
    );
    assert.throws(() => run("enable"));
    assert.equal(
      await readFile(`${dir}/.secrets/supabase.env`, "utf8"),
      "SMTP_HOST=custom.example\n",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
