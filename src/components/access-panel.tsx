"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import {
  AccountShell,
  accountRequest,
  errorKey,
  useAccountLocale,
} from "./account-shell";

type Mode = "login" | "signup" | "recover" | "resend";
export function AccessPanel({ localMailbox }: { localMailbox?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const language = useAccountLocale();
  const { tr, locale } = language;
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<AuthKey | null>(null);
  const [error, setError] = useState<AuthKey | null>(null);
  useEffect(() => {
    if (mode) heading.current?.focus({ preventScroll: true });
  }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await accountRequest(`/api/auth/${mode}`, {
        email: data.get("email"),
        password: data.get("password"),
      });
      form.reset();
      if (mode === "login") location.assign(`/cuenta?lang=${locale}`);
      else setNotice("sent");
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountShell language={language}>
      <section className="account-card">
        <p className="eyebrow">{tr("phase3")}</p>
        <h1 ref={heading} tabIndex={-1}>
          {tr(mode)}
        </h1>
        <p>{tr(`${mode}Help`)}</p>
        {localMailbox && (
          <aside>
            <p>{tr("localMailHelp")}</p>
            <a href={localMailbox} target="_blank" rel="noopener noreferrer">
              {tr("localMailOpen")}
            </a>
          </aside>
        )}
        <form onSubmit={submit}>
          <label htmlFor="email">{tr("email")}</label>
          <input
            name="email"
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
          {["login", "signup"].includes(mode) && (
            <>
              <label htmlFor="password">{tr("password")}</label>
              <input
                name="password"
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={mode === "signup" ? 12 : undefined}
                maxLength={128}
                required
              />
            </>
          )}
          {error && (
            <p className="account-error" role="alert">
              {tr(error)}
            </p>
          )}
          {notice && <p role="status">{tr(notice)}</p>}
          <button
            className="button button-primary full"
            type="submit"
            disabled={busy}
          >
            {tr(busy ? "working" : mode)}
          </button>
        </form>
        <nav className="account-links" aria-label={tr("account")}>
          {(["login", "signup", "recover", "resend"] as const)
            .filter((m) => m !== mode)
            .map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => {
                  setMode(m);
                  setNotice(null);
                  setError(null);
                }}
              >
                {tr(m)}
              </button>
            ))}
        </nav>
        <a href={`/?lang=${locale}`}>{tr("home")}</a>
      </section>
    </AccountShell>
  );
}
