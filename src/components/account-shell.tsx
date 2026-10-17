"use client";
import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { type AuthKey, authText } from "@/lib/i18n/auth-copy";
import type { Locale } from "@/lib/i18n/copy";
export function useAccountLocale() {
  const [locale, setLocale] = useState<Locale>("es");
  useEffect(() => {
    if (new URLSearchParams(location.search).get("lang") === "ca")
      setLocale("ca");
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const tr = (key: AuthKey) => authText(locale, key);
  return {
    locale,
    tr,
    change: (next: Locale) => {
      setLocale(next);
      const url = new URL(location.href);
      url.searchParams.set("lang", next);
      history.replaceState(null, "", url);
    },
  };
}
export type AccountLanguage = ReturnType<typeof useAccountLocale>;
export function AccountShell({
  language,
  children,
}: {
  language: AccountLanguage;
  children: ReactNode;
}) {
  const { locale, tr, change } = language;
  return (
    <div className="account-page">
      <a className="skip-link" href="#account-main">
        {locale === "ca" ? "Salta al contingut" : "Saltar al contenido"}
      </a>
      <header className="account-header">
        <a href={`/?lang=${locale}`}>
          <Image
            src="/brand/logo.svg"
            width="218"
            height="44"
            alt="BoletinExpress"
          />
        </a>
        <fieldset className="language" aria-label={tr("language")}>
          {(["es", "ca"] as const).map((l) => (
            <button
              type="button"
              key={l}
              aria-pressed={locale === l}
              onClick={() => change(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </fieldset>
      </header>
      <div className="account-banner">{tr("notice")}</div>
      <main id="account-main" className="account-main">
        {children}
      </main>
    </div>
  );
}
export async function accountRequest(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "unavailable");
  return data;
}
export function errorKey(error: unknown): AuthKey {
  const key = error instanceof Error ? error.message : "unavailable";
  return [
    "insufficient_credits",
    "review_invalid",
    "review_expired",
    "pdf_not_ready",
    "conflict",
    "session",
    "credentials",
    "registration",
    "link",
    "rate",
    "input",
    "origin",
    "size",
    "format",
    "pdf",
    "upload",
    "not_found",
    "closed",
    "draft_limit",
    "file_limit",
    "password",
  ].includes(key)
    ? key === "password"
      ? "input"
      : (key as AuthKey)
    : "unavailable";
}
