"use client";
import type { AccountLanguage } from "./account-shell";
import { PdfPreview } from "./pdf-preview";
export function ValidatedDocument({
  id,
  language,
  onBack,
}: {
  id: string;
  language: AccountLanguage;
  onBack: () => void;
}) {
  const { tr } = language;
  const url = `/api/private/documents/${id}/pdf`;
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
      <p>{tr("validatedHelp")}</p>
      <div className="editor-actions">
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
      </div>
      <PdfPreview
        url={`${url}?view=1`}
        label={tr("preview")}
        failure={tr("unavailable")}
      />
    </section>
  );
}
