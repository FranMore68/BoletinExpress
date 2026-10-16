import type { FormEvent, ReactNode } from "react";
import type { CopyKey } from "@/lib/i18n/copy";
import type { DemoDocument, DemoState, Field } from "@/modules/demo/model";
import { documentTypes } from "@/modules/documents/catalog";
import type { Method, Navigate, ScreenProps } from "./experience-types";
import { Icon } from "./icons";
export function EditorView({
  tr,
  heading,
  doc,
  method,
  setMethod,
  loadExample,
  notesText,
  setNotesText,
  review,
  field,
  navigate,
  setNotice,
  cost,
  demo,
}: ScreenProps & {
  doc: DemoDocument;
  method: Method;
  setMethod: (method: Method) => void;
  loadExample: () => void;
  notesText: string;
  setNotesText: (text: string) => void;
  review: (event: FormEvent) => void;
  field: (name: Field, multiline?: boolean) => ReactNode;
  navigate: Navigate;
  setNotice: (key: CopyKey) => void;
  cost: number;
  demo: Pick<DemoState, "credits">;
}) {
  return (
    <>
      <div className="page-heading">
        <h1 ref={heading} tabIndex={-1}>
          {tr("editorTitle", { type: documentTypes[doc.type].label })}
        </h1>
        <p className="lead">{tr("editorLead")}</p>
      </div>
      <div className="editor-grid">
        <div>
          <fieldset className="entry-methods" aria-label={tr("collect")}>
            {(["manual", "text", "voice", "photo"] as const).map((m, i) => (
              <button
                key={m}
                type="button"
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
              >
                <Icon
                  name={
                    i === 0
                      ? "grid"
                      : i === 1
                        ? "text"
                        : i === 2
                          ? "audio"
                          : "photo"
                  }
                  size={20}
                />
                {tr(m)}
              </button>
            ))}
          </fieldset>
          <div className="input-helper">
            {method === "manual" ? (
              <>
                <p>{tr("required")}</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={loadExample}
                >
                  <Icon name="plus" size={16} />
                  {tr("loadExample")}
                </button>
              </>
            ) : (
              <>
                <span className="badge">{tr("simulatedExtraction")}</span>
                {method === "text" ? (
                  <>
                    <label htmlFor="free-notes">{tr("textLabel")}</label>
                    <textarea
                      id="free-notes"
                      value={notesText}
                      maxLength={1200}
                      rows={3}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder={tr("textPlaceholder")}
                    />
                    <p className="muted">{tr("exampleNotes")}</p>
                  </>
                ) : (
                  <>
                    <h2>
                      {tr(method === "voice" ? "audioTitle" : "photoTitle")}
                    </h2>
                    <p>{tr(method === "voice" ? "audioHelp" : "photoHelp")}</p>
                    <p className="muted">
                      {tr(method === "voice" ? "audioLimit" : "photoLimit")}
                    </p>
                  </>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={loadExample}
                >
                  {tr(
                    method === "text"
                      ? "loadProposals"
                      : method === "voice"
                        ? "audioExample"
                        : "photoExample",
                  )}
                  <Icon name="arrow" size={18} />
                </button>
              </>
            )}
          </div>
          <form noValidate onSubmit={review}>
            <fieldset>
              <legend>{tr("holderGroup")}</legend>
              <div className="fields-grid">
                {field("holder")}
                {field("identifier")}
              </div>
            </fieldset>
            <fieldset>
              <legend>{tr("installation")}</legend>
              <div className="fields-grid">
                {field("address")}
                {field("power")}
                {field("use")}
                {field("notes", true)}
              </div>
            </fieldset>
            <p className="muted">{tr("fieldNote")}</p>
            <div className="form-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  navigate("documents");
                  setNotice("saved");
                }}
              >
                {tr("saveExit")}
              </button>
              <button type="submit" className="button button-primary">
                {tr("goReview")}
                <Icon name="arrow" size={18} />
              </button>
            </div>
          </form>
        </div>
        <aside className="editor-aside">
          <div className="aside-document">
            <div className="mini-document" aria-hidden="true">
              <Icon name="document" size={54} />
              <span>{doc.type}</span>
              <i />
              <i />
              <i />
            </div>
            <div className="aside-meta">
              <span className="badge">{tr("draft")}</span>
              <h2>{documentTypes[doc.type].label}</h2>
              <p>{tr("cost")}</p>
              <strong>{cost} KC</strong>
              <span>
                {tr("balance")}: {demo.credits} KC
              </span>
            </div>
          </div>
          <p className="session-note">{tr("sessionOnly")}</p>
        </aside>
      </div>
    </>
  );
}
