"use client";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import { brieFields, type FieldValues } from "@/modules/documents/brie-schema";
import { documentTypes } from "@/modules/documents/catalog";
import {
  activeCieValues,
  cieFieldActive,
  cieFields,
  cieIssues,
} from "@/modules/documents/cie-schema";
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
export type DocumentDraft = {
  id: string;
  work_data: FieldValues;
  revision: number;
};
export function DocumentEditor({
  document,
  onBack,
  language,
  model,
  onValidated,
}: {
  document: DocumentDraft;
  model: "BRIE" | "CIE";
  onBack: () => void;
  language: AccountLanguage;
  onValidated: () => Promise<void>;
}) {
  const { tr, locale } = language;
  const [fields, setFields] = useState(document.work_data || {});
  const [revision, setRevision] = useState(document.revision || 0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview>(null);
  const [error, setError] = useState<AuthKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewRender, setPreviewRender] = useState(0);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const rendered = useCallback((value: string | null) => {
    setReceipt(value);
    setReviewed(false);
  }, []);
  async function validate() {
    if (busy || dirty || !receipt || !reviewed) return;
    setBusy(true);
    setError(null);
    try {
      await accountRequest(`${base}/validate`, { reviewToken: receipt });
      await onValidated();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
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
      if (model === "CIE" && cieIssues(activeCieValues(fields)).length) {
        setError("cieInput");
        return;
      }
      const r = await accountRequest(`${base}/fields`, {
        fields: model === "CIE" ? activeCieValues(fields) : fields,
        revision,
      });
      setFields(r.document.work_data);
      setRevision(r.document.revision);
      setDirty(false);
      setPreview(null);
      rendered(null);
      setSaved(true);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (
      busy ||
      dirty ||
      (model === "CIE" && cieIssues(activeCieValues(fields)).length > 0)
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const r = await accountRequest(`${base}/preview`, {
        revision,
        retry: true,
      });
      setPreview(r.preview);
      rendered(null);
      setPreviewRender((value) => value + 1);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  const schema = model === "CIE" ? cieFields : brieFields;
  const activeFields =
    model === "CIE"
      ? cieFields.filter((f) => cieFieldActive(f, fields))
      : schema;
  const working = model === "CIE" ? activeCieValues(fields) : fields;
  const issues = model === "CIE" ? cieIssues(working) : [];
  const discardedBranches =
    model === "CIE" &&
    Object.keys(fields).some(
      (k) => fields[k] !== "" && !Object.hasOwn(working, k),
    );
  const empty = activeFields.filter(
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
      <h2>{tr(model === "CIE" ? "cieManual" : "brieManual")}</h2>
      <p>{tr(model === "CIE" ? "cieHelp" : "brieHelp")}</p>
      <p>{tr(model === "CIE" ? "cieSafety" : "brieSafety")}</p>
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
      {discardedBranches && <p role="status">{tr("cieBranchChange")}</p>}
      {issues.length > 0 && (
        <div role="alert" className="account-error">
          <p>{tr("cieInput")}</p>
          <ul>
            {issues.map((k) => (
              <li key={k}>
                {
                  schema.find((f) => f.key === k)?.label[
                    locale === "ca" ? 1 : 0
                  ]
                }
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <FormFields
            schema={activeFields}
            values={fields}
            locale={locale}
            prefix={model.toLowerCase()}
            errors={[...(preview?.error_fields || []), ...issues]}
            onChange={(v) => {
              setFields(v);
              setDirty(true);
              rendered(null);
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
              disabled={dirty || Boolean(pending) || issues.length > 0}
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
                {schema.find((f) => f.key === k)?.label[
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
            <h2>{tr(model === "CIE" ? "reviewCie" : "reviewBrie")}</h2>
            <p>{tr("previewDraftNotice")}</p>
            <a
              href={`${base}/preview/file?revision=${revision}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("openPreview")}
            </a>
            <PdfPreview
              key={previewRender}
              label={tr(model === "CIE" ? "reviewCie" : "reviewBrie")}
              url={`${base}/preview/file?revision=${revision}`}
              failure={tr("unavailable")}
              onRendered={rendered}
            />
            <p>{tr("validationHelp")}</p>
            {error && (
              <p role="alert" className="account-error">
                {tr(error)}
              </p>
            )}
            <label className="review-confirm">
              <input
                type="checkbox"
                checked={reviewed}
                disabled={!receipt || busy}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              {tr("reviewConfirm")}
            </label>
            <button
              type="button"
              className="button button-primary"
              disabled={!receipt || !reviewed || busy}
              onClick={validate}
            >
              {tr(busy ? "working" : "validateDocument")} ·{" "}
              {documentTypes[model].creditCost} KC
            </button>
          </section>
        )}
    </section>
  );
}
