"use client";
import { type FormEvent, useEffect, useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import { brieFields, type FieldValues } from "@/modules/documents/brie-schema";
import {
  type AccountLanguage,
  accountRequest,
  errorKey,
} from "./account-shell";
import { FormFields } from "./form-fields";
import { PdfPreview } from "./pdf-preview";

type Preview = {
  revision: number;
  status: string;
  error_fields: string[];
  sha256?: string;
} | null;
export type BrieDoc = { id: string; work_data: FieldValues; revision: number };
export function BrieEditor({
  document,
  onBack,
  language,
}: {
  document: BrieDoc;
  onBack: () => void;
  language: AccountLanguage;
}) {
  const { tr, locale } = language;
  const [fields, setFields] = useState(document.work_data || {});
  const [revision, setRevision] = useState(document.revision || 0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview>(null);
  const [error, setError] = useState<AuthKey | null>(null);
  const [saved, setSaved] = useState(false);
  const base = `/api/private/documents/${document.id}`;
  useEffect(() => {
    let cancelled = false;
    accountRequest(`${base}/preview`)
      .then((r) => {
        if (!cancelled) setPreview(r.preview);
      })
      .catch((e) => {
        if (!cancelled) setError(errorKey(e));
      });
    return () => {
      cancelled = true;
    };
  }, [base]);
  const pending = preview && ["pending", "processing"].includes(preview.status);
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const timer = setInterval(() => {
      accountRequest(`${base}/preview`)
        .then((r) => {
          if (!cancelled) setPreview(r.preview);
        })
        .catch((e) => {
          if (!cancelled) setError(errorKey(e));
        });
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [base, pending]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await accountRequest(`${base}/fields`, { fields, revision });
      setFields(r.document.work_data);
      setRevision(r.document.revision);
      setDirty(false);
      setPreview(null);
      setSaved(true);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (busy || dirty) return;
    setBusy(true);
    setError(null);
    try {
      const r = await accountRequest(`${base}/preview`, {
        revision,
        retry: true,
      });
      setPreview(r.preview);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  const empty = brieFields.filter(
    (f) => fields[f.key] === undefined || fields[f.key] === "",
  );
  return (
    <section className="private-block">
      <div className="editor-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={busy}
          onClick={() => {
            if (!dirty || window.confirm(tr("unsavedConfirm"))) onBack();
          }}
        >
          {tr("back")}
        </button>
        <span>
          {tr("revision")} {revision}
        </span>
      </div>
      <h2>{tr("brieManual")}</h2>
      <p>{tr("brieHelp")}</p>
      <p>{tr("brieSafety")}</p>
      <details>
        <summary>
          {tr("emptyFields")} ({empty.length})
        </summary>
        <p>{tr("emptyHelp")}</p>
        <ul>
          {empty.map((f) => (
            <li key={f.key}>{f.label[locale === "ca" ? 1 : 0]}</li>
          ))}
        </ul>
      </details>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <FormFields
            schema={brieFields}
            values={fields}
            locale={locale}
            prefix="brie"
            errors={preview?.error_fields || []}
            onChange={(v) => {
              setFields(v);
              setDirty(true);
              setSaved(false);
            }}
          />
          {error && (
            <p role="alert" className="account-error">
              {tr(error)}
            </p>
          )}
          {saved && <p role="status">{tr("draftSaved")}</p>}
          <div className="editor-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={!dirty}
            >
              {tr(busy ? "working" : "saveDraft")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={generate}
              disabled={dirty || Boolean(pending)}
            >
              {tr(pending ? "generating" : "generatePreview")}
            </button>
          </div>
          {dirty && <p role="status">{tr("saveBeforePreview")}</p>}
        </fieldset>
      </form>
      {preview?.status === "failed" && (
        <div role="alert" className="account-error">
          <p>{tr(preview.error_fields.length ? "pdfFit" : "unavailable")}</p>
          <ul>
            {preview.error_fields.map((k) => (
              <li key={k}>
                {brieFields.find((f) => f.key === k)?.label[
                  locale === "ca" ? 1 : 0
                ] || tr("preview")}
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview?.status === "ready" &&
        !dirty &&
        preview.revision === revision && (
          <section className="generated-preview">
            <h2>{tr("reviewBrie")}</h2>
            <p>{tr("previewDraftNotice")}</p>
            <a
              href={`${base}/preview/file?revision=${revision}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("openPreview")}
            </a>
            <PdfPreview
              label={tr("reviewBrie")}
              url={`${base}/preview/file?revision=${revision}`}
              failure={tr("unavailable")}
            />
          </section>
        )}
    </section>
  );
}
