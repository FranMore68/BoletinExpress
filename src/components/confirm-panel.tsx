"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import {
  AccountShell,
  accountRequest,
  errorKey,
  useAccountLocale,
} from "./account-shell";
export function ConfirmPanel({ reset = false }: { reset?: boolean }) {
  const language = useAccountLocale();
  const { tr, locale } = language;
  const [recovery, setRecovery] = useState(false);
  const token = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (reset) return;
    const url = new URL(location.href);
    token.current = url.searchParams.get("token_hash");
    setRecovery(url.searchParams.get("type") === "recovery");
    url.searchParams.delete("token_hash");
    url.searchParams.delete("type");
    history.replaceState(null, "", url);
  }, [reset]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (reset) {
        const data = new FormData(event.currentTarget);
        await accountRequest("/api/auth/password", {
          password: data.get("password"),
        });
        setDone(true);
      } else {
        await accountRequest("/api/auth/confirm", {
          token_hash: token.current,
          type: recovery ? "recovery" : "email",
        });
        token.current = null;
        location.replace(
          `${recovery ? "/auth/reset" : "/cuenta"}?lang=${locale}`,
        );
      }
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountShell language={language}>
      <section className="account-card">
        <h1>
          {tr(reset ? "reset" : recovery ? "recoveryConfirm" : "confirm")}
        </h1>
        <p>{tr(done ? "resetDone" : reset ? "resetHelp" : "confirmHelp")}</p>
        {!done && (
          <form onSubmit={submit}>
            {reset && (
              <>
                <label htmlFor="new-password">{tr("newPassword")}</label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </>
            )}
            {error && (
              <p role="alert" className="account-error">
                {tr(error)}
              </p>
            )}
            <button
              className="button button-primary full"
              disabled={busy}
              type="submit"
            >
              {tr(
                busy
                  ? "working"
                  : reset
                    ? "reset"
                    : recovery
                      ? "recoveryConfirm"
                      : "confirm",
              )}
            </button>
          </form>
        )}
        <a href={`/acceso?lang=${locale}`}>{tr("login")}</a>
      </section>
    </AccountShell>
  );
}
