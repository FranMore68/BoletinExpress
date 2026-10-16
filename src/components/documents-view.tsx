import type { DemoDocument, DemoState } from "@/modules/demo/model";
import { documentTypes } from "@/modules/documents/catalog";
import type { Dialog, Filter, Navigate, ScreenProps } from "./experience-types";
import { Icon } from "./icons";

export function DocumentsView({
  tr,
  heading,
  demo,
  navigate,
  filter,
  setFilter,
  openDocument,
  setDeleteId,
  setDialog,
}: ScreenProps & {
  demo: DemoState;
  navigate: Navigate;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  openDocument: (doc: DemoDocument) => void;
  setDeleteId: (id: string) => void;
  setDialog: (dialog: Dialog) => void;
}) {
  return (
    <section>
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">BRIE / CIE ELEC-1</p>
          <h1 ref={heading} tabIndex={-1}>
            {tr("yourDocuments")}
          </h1>
          <p className="lead">{tr("documentLead")}</p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => navigate("choose")}
        >
          <Icon name="plus" size={18} />
          {tr("create")}
        </button>
      </div>
      <fieldset className="filter-tabs" aria-label={tr("documents")}>
        {(["all", "drafts", "validatedPlural"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {tr(f)}
          </button>
        ))}
      </fieldset>
      {demo.documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-art" aria-hidden="true">
            <Icon name="document" size={56} />
          </div>
          <h2>{tr("emptyTitle")}</h2>
          <p>{tr("emptyLead")}</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate("choose")}
          >
            {tr("create")}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      ) : (
        <div className="documents-list">
          {demo.documents
            .filter(
              (d) =>
                filter === "all" ||
                (filter === "drafts" ? !d.validated : d.validated),
            )
            .map((d) => (
              <article key={d.id}>
                <div className="list-icon">
                  <Icon name="document" size={28} />
                </div>
                <div className="document-list-info">
                  <span>{d.id}</span>
                  <h2>{d.data.holder || documentTypes[d.type].label}</h2>
                  <p>
                    {documentTypes[d.type].label} ·{" "}
                    {d.data.address || tr("noValue")}
                  </p>
                </div>
                <span className={`badge ${d.validated ? "badge-success" : ""}`}>
                  {tr(d.validated ? "validated" : "draft")}
                </span>
                <div className="document-list-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => openDocument(d)}
                  >
                    {tr(d.validated ? "viewExample" : "resume")}
                    <Icon name="arrow" size={16} />
                  </button>
                  {!d.validated && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setDeleteId(d.id);
                        setDialog("delete");
                      }}
                    >
                      {tr("delete")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          {!demo.documents.some(
            (d) =>
              filter === "all" ||
              (filter === "drafts" ? !d.validated : d.validated),
          ) && <p className="filter-empty">{tr("emptyFilter")}</p>}
        </div>
      )}
      <p className="session-note">{tr("sessionOnly")}</p>
    </section>
  );
}
