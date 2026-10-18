"use client";
import { useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import {
  type AccountLanguage,
  accountRequest,
  errorKey,
} from "./account-shell";
import { PdfPreview } from "./pdf-preview";
export function ValidatedDocument({
  id,
  validatedAt,
  documentTime,
  language,
  onBack,
}: {
  id: string;
  validatedAt: string;
  documentTime: string;
  language: AccountLanguage;
  onBack: () => void;
}) {
  const { tr, locale } = language;
  const url = `/api/private/documents/${id}/pdf`;
  const archived =
    Date.parse(documentTime) >= Date.parse(validatedAt) + 30 * 86400000;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  async function email() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await accountRequest(`/api/private/documents/${id}/email`, {
        requestId,
        locale,
      });
      setNotice(true);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="private-block">
      <button
        type="button"
        className="button button-secondary"
        onClick={onBack}
      >
        {tr("back")}
      </button>
      <h2>{tr("validatedStatus")}</h2>
      <p>{tr(archived ? "archiveHelp" : "validatedHelp")}</p>
      <p>
        {tr("deletionAt")}:{" "}
        {new Date(Date.parse(validatedAt) + 60 * 86400000).toLocaleString(
          locale === "ca" ? "ca-ES" : "es-ES",
        )}
      </p>
      {error && (
        <p className="account-error" role="alert">
          {tr(error)}
        </p>
      )}
      {notice && <p role="status">{tr("emailQueued")}</p>}
      <div className="editor-actions">
        {!archived && (
          <>
            <a className="button button-primary" href={url}>
              {tr("download")}
            </a>
            <a
              className="button button-secondary"
              href={`${url}?view=1`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("printPdf")}
            </a>
          </>
        )}
        <button
          type="button"
          className="button button-secondary"
          onClick={email}
          disabled={busy || notice}
        >
          {tr(busy ? "working" : "emailDocument")}
        </button>
      </div>
      {!archived && (
        <PdfPreview
          url={`${url}?view=1`}
          label={tr("preview")}
          failure={tr("unavailable")}
        />
      )}
    </section>
  );
}
