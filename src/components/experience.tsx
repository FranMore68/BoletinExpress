"use client";
import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { type CopyKey, type Locale, translate } from "@/lib/i18n/copy";
import {
  addTestCredits,
  applyExample,
  createDraft,
  type DemoDocument,
  editField,
  type Field,
  initialDemo,
  missingFields,
  validateExample,
} from "@/modules/demo/model";
import { type DocumentType, documentTypes } from "@/modules/documents/catalog";
import { testPacks } from "@/modules/payments/packs";
import { ChooseView } from "./choose-view";
import { CreditsView } from "./credits-view";
import { Modal } from "./dialog";
import { DocumentsView } from "./documents-view";
import { EditorView } from "./editor-view";
import type { Access, Dialog, Filter, Method, View } from "./experience-types";
import { Icon } from "./icons";
import { IntroView } from "./intro-view";
import { LandingView } from "./landing-view";
import { PdfExamplePreview } from "./pdf-example-preview";

const views: View[] = [
  "landing",
  "intro",
  "choose",
  "editor",
  "review",
  "done",
  "documents",
  "credits",
];

export function Experience() {
  const [locale, setLocale] = useState<Locale>("es");
  const [view, setView] = useState<View>("landing");
  const [access, setAccess] = useState<Access>("register");
  const [demo, setDemo] = useState(initialDemo);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("manual");
  const [errors, setErrors] = useState<Field[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<CopyKey | null>(null);
  const [noticeValues, setNoticeValues] = useState<
    Record<string, string | number>
  >({});
  const [notesText, setNotesText] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const previousView = useRef<View>("landing");
  const tr = (key: CopyKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const doc = demo.documents.find((d) => d.id === activeId);
  const cost = doc ? documentTypes[doc.type].creditCost : 0;
  function navigate(next: View, id: string | null = activeId) {
    setView(next);
    setNotice(null);
    window.history.pushState(
      { be: true, view: next, activeId: id },
      "",
      `${window.location.search}#${next}`,
    );
  }
  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang === "ca") setLocale("ca");
    window.history.replaceState(
      { be: true, view: "landing" },
      "",
      window.location.search,
    );
  }, []);
  useEffect(() => {
    const back = (event: PopStateEvent) => {
      const requested = event.state?.view as View;
      let next: View = views.includes(requested) ? requested : "landing";
      const restored = demo.documents.find(
        (d) => d.id === event.state?.activeId,
      );
      if (["editor", "review", "done"].includes(next)) {
        if (!restored) next = "documents";
        else if (restored.validated) next = "done";
        else if (next === "done") next = "editor";
      }
      setActiveId(restored?.id ?? null);
      setView(next);
      setDialog(null);
      setNotice(null);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [demo.documents]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    if (previousView.current !== view) {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      previousView.current = view;
    }
  }, [view]);
  useEffect(() => {
    if (
      view !== "landing" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const move = () =>
      wheel.current?.style.setProperty(
        "--wheel-turn",
        `${window.scrollY * 0.045}deg`,
      );
    move();
    window.addEventListener("scroll", move, { passive: true });
    return () => window.removeEventListener("scroll", move);
  }, [view]);
  function changeLanguage(next: Locale) {
    setLocale(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({ be: true, view }, "", url);
  }
  function start(type: DocumentType) {
    try {
      const next = createDraft(demo, type);
      setDemo(next);
      setActiveId(next.documents.at(-1)?.id ?? null);
      setMethod("manual");
      setErrors([]);
      setReviewed(false);
      setPage(1);
      setNotesText("");
      navigate("editor", next.documents.at(-1)?.id ?? null);
    } catch {
      setNotice("draftLimit");
    }
  }
  function updateDoc(change: (d: DemoDocument) => DemoDocument) {
    setDemo((s) => ({
      ...s,
      documents: s.documents.map((d) => (d.id === activeId ? change(d) : d)),
    }));
    setReviewed(false);
  }
  function loadExample() {
    updateDoc((d) =>
      applyExample(d, {
        holder: tr("exampleHolder"),
        identifier: "FICTICI01",
        address: tr("exampleAddress"),
        power: "9,2",
        use: tr("exampleUse"),
        notes: tr("exampleObservation"),
      }),
    );
    setNotice("proposedStatus");
    setErrors([]);
  }
  function review(event: FormEvent) {
    event.preventDefault();
    if (!doc) return;
    const missing = missingFields(doc.data);
    setErrors(missing);
    if (missing.length) {
      setNotice("fixErrors");
      document.getElementById(`field-${missing[0]}`)?.focus();
      return;
    }
    setReviewed(false);
    setPage(1);
    navigate("review");
  }
  function validate() {
    if (!doc || !reviewed || demo.credits < cost) return;
    setDemo((s) => validateExample(s, doc.id));
    setDialog(null);
    navigate("done");
  }
  function openDocument(d: DemoDocument) {
    setActiveId(d.id);
    setErrors([]);
    setReviewed(false);
    setPage(1);
    navigate(d.validated ? "done" : "editor", d.id);
  }
  function languageControl() {
    return (
      <fieldset className="language" aria-label={tr("language")}>
        {(["es", "ca"] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={locale === l}
            onClick={() => changeLanguage(l)}
            lang={l}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </fieldset>
    );
  }
  function brand() {
    return (
      <button
        type="button"
        className="brand"
        onClick={() => navigate("landing")}
        aria-label="BoletinExpress"
      >
        <Image
          src="/brand/logo.svg"
          alt="BoletinExpress"
          width={248}
          height={45}
          priority
        />
        <Image
          className="brand-symbol"
          src="/brand/symbol.svg"
          alt=""
          width={44}
          height={44}
        />
      </button>
    );
  }
  function stepper() {
    const step = view === "editor" ? 0 : view === "review" ? 1 : 2;
    return (
      <ol className="stepper" aria-label={tr("how")}>
        {(["data", "review", "finished"] as const).map((key, i) => (
          <li
            key={key}
            className={i === step ? "current" : i < step ? "complete" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <span>
              {i < step ? <Icon name="check" size={16} /> : `0${i + 1}`}
            </span>
            {tr(key)}
          </li>
        ))}
      </ol>
    );
  }

  function field(name: Field, multiline = false) {
    if (!doc) return null;
    const common = {
      id: `field-${name}`,
      name,
      value: doc.data[name],
      maxLength: name === "notes" ? 600 : 160,
      required: ["holder", "address", "power"].includes(name),
      "aria-invalid": errors.includes(name) || undefined,
      "aria-describedby": errors.includes(name) ? `error-${name}` : undefined,
      onChange: (e: { target: { value: string } }) => {
        updateDoc((d) => editField(d, name, e.target.value));
        setErrors((old) => old.filter((n) => n !== name));
      },
    };
    return (
      <div
        className={`field ${name === "holder" || name === "address" || multiline ? "field-wide" : ""}`}
      >
        <label htmlFor={common.id}>
          {tr(name)}
          {doc.edited.includes(name) ? (
            <span className="field-origin" aria-hidden="true">
              {tr("manualValue")}
            </span>
          ) : doc.proposed ? (
            <span className="field-origin" aria-hidden="true">
              {tr("proposed")}
            </span>
          ) : null}
        </label>
        {multiline ? (
          <textarea {...common} rows={3} />
        ) : (
          <input
            {...common}
            type="text"
            autoComplete="off"
            inputMode={name === "power" ? "decimal" : undefined}
          />
        )}
        {errors.includes(name) && (
          <span className="field-error" id={`error-${name}`}>
            {tr(name === "power" ? "powerError" : "missing")}
          </span>
        )}
      </div>
    );
  }
  const pack =
    dialog === "basic" || dialog === "pro" ? testPacks[dialog] : null;
  const price = (amount: number) =>
    new Intl.NumberFormat(locale === "ca" ? "ca-ES" : "es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount / 100);

  return (
    <>
      <a className="skip-link" href="#main">
        {tr("skip")}
      </a>
      <header className="site-header">
        <div className="header-inner">
          {brand()}
          {view === "landing" ? (
            <nav className="landing-nav" aria-label={tr("how")}>
              <a href="#how">{tr("how")}</a>
              <a href="#models">BRIE / CIE</a>
            </nav>
          ) : (
            <nav className="app-nav" aria-label="BoletinExpress">
              <button
                type="button"
                className={view === "choose" ? "active" : ""}
                onClick={() => navigate("choose")}
              >
                <Icon name="plus" size={18} />
                {tr("create")}
              </button>
              <button
                type="button"
                className={view === "documents" ? "active" : ""}
                onClick={() => navigate("documents")}
              >
                <Icon name="document" size={18} />
                {tr("documents")}
              </button>
            </nav>
          )}
          <div className="header-actions">
            {languageControl()}
            {view === "landing" ? (
              <a className="header-access" href="#access">
                {tr("enter")}
                <Icon name="arrow" size={16} />
              </a>
            ) : (
              <button
                type="button"
                className="balance-button"
                aria-label={`${tr("balance")}: ${demo.credits} KC`}
                onClick={() => navigate("credits")}
              >
                <Icon name="wallet" size={18} />
                <strong data-testid="balance">{demo.credits} KC</strong>
              </button>
            )}
          </div>
        </div>
      </header>
      {view !== "landing" && (
        <div className="demo-bar">
          <span>
            <i />
            {tr("demo")}
          </span>
          <button type="button" onClick={() => setDialog("help")}>
            {tr("aboutDemo")}
          </button>
        </div>
      )}
      <main id="main" className={view === "landing" ? "landing" : "app-main"}>
        {notice && (
          <div
            className={`notice ${notice === "fixErrors" || notice === "draftLimit" ? "notice-error" : ""}`}
            role={
              notice === "fixErrors" || notice === "draftLimit"
                ? "alert"
                : "status"
            }
          >
            <Icon
              name={
                notice === "fixErrors" || notice === "draftLimit"
                  ? "close"
                  : "check"
              }
              size={18}
            />
            {tr(notice, noticeValues)}
          </div>
        )}
        {view === "landing" && (
          <LandingView
            locale={locale}
            tr={tr}
            heading={heading}
            wheel={wheel}
            access={access}
            setAccess={setAccess}
            navigate={navigate}
            demo={demo}
          />
        )}
        {view === "intro" && (
          <IntroView tr={tr} heading={heading} navigate={navigate} />
        )}
        {view === "choose" && (
          <ChooseView tr={tr} heading={heading} start={start} />
        )}
        {(["editor", "review", "done"] as View[]).includes(view) && doc && (
          <>
            <div className="workspace-top">
              <span className="document-id">
                {doc.id}{" "}
                <b>
                  {documentTypes[doc.type].label} · {cost} KC
                </b>
              </span>
              {stepper()}
            </div>
            {view === "editor" && (
              <EditorView
                tr={tr}
                heading={heading}
                doc={doc}
                method={method}
                setMethod={setMethod}
                loadExample={loadExample}
                notesText={notesText}
                setNotesText={setNotesText}
                review={review}
                field={field}
                navigate={navigate}
                setNotice={setNotice}
                cost={cost}
                demo={demo}
              />
            )}
            {view === "review" && (
              <>
                <div className="page-heading">
                  <h1 ref={heading} tabIndex={-1}>
                    {tr("reviewTitle")}
                  </h1>
                  <p className="lead">{tr("reviewLead")}</p>
                </div>
                <div className="review-grid">
                  <PdfExamplePreview
                    type={doc.type}
                    page={page}
                    setPage={setPage}
                    onZoom={() => setDialog("preview")}
                    tr={tr}
                  />
                  <section className="review-data">
                    <h2>{tr("summary")}</h2>
                    <dl>
                      {(
                        [
                          "holder",
                          "identifier",
                          "address",
                          "power",
                          "use",
                          "notes",
                        ] as const
                      ).map((name) => (
                        <div key={name}>
                          <dt>{tr(name).replace(" *", "")}</dt>
                          <dd>{doc.data[name] || tr("noValue")}</dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => navigate("editor")}
                    >
                      <Icon
                        name="arrow"
                        size={16}
                        style={{ transform: "rotate(180deg)" }}
                      />
                      {tr("backData")}
                    </button>
                    <div className="validation-box">
                      <div className="validation-cost">
                        <span>{tr("cost")}</span>
                        <strong>{cost} KC</strong>
                      </div>
                      <p>
                        {tr("balance")}: {demo.credits} KC
                      </p>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={reviewed}
                          onChange={(e) => setReviewed(e.target.checked)}
                        />
                        {tr("reviewCheck")}
                      </label>
                      {demo.credits < cost ? (
                        <>
                          <p className="field-error">
                            {tr("insufficient", {
                              cost,
                              balance: demo.credits,
                            })}
                          </p>
                          <button
                            type="button"
                            className="button button-primary full"
                            onClick={() => navigate("credits")}
                          >
                            {tr("recharge")}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="button button-primary full"
                          disabled={!reviewed}
                          onClick={() => setDialog("validate")}
                        >
                          {tr("validate", { cost })}
                          <Icon name="check" size={18} />
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}
            {view === "done" && (
              <section className="done-layout">
                <div className="done-copy">
                  <div className="success-icon">
                    <Icon name="check" size={36} />
                  </div>
                  <span className="badge badge-success">{tr("validated")}</span>
                  <h1 ref={heading} tabIndex={-1}>
                    {tr("doneTitle")}
                  </h1>
                  <p className="lead">{tr("doneLead")}</p>
                  <p className="used-credit">{tr("creditUsed", { cost })}</p>
                  <div className="done-actions">
                    <a
                      className="button button-primary"
                      href={`/demo/${doc.type}-ejemplo.pdf`}
                      download
                    >
                      <Icon name="download" size={20} />
                      {tr("download")}
                    </a>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setDialog("print")}
                    >
                      {tr("print")}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setNotice("emailStatus")}
                    >
                      {tr("emailDemo")}
                    </button>
                  </div>
                  <div className="done-links">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => navigate("documents")}
                    >
                      {tr("documents")}
                      <Icon name="arrow" size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => navigate("choose")}
                    >
                      {tr("newAnother")}
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                </div>
                <PdfExamplePreview
                  type={doc.type}
                  page={page}
                  setPage={setPage}
                  onZoom={() => setDialog("preview")}
                  tr={tr}
                />
              </section>
            )}
          </>
        )}
        {view === "documents" && (
          <DocumentsView
            tr={tr}
            heading={heading}
            demo={demo}
            navigate={navigate}
            filter={filter}
            setFilter={setFilter}
            openDocument={openDocument}
            setDeleteId={setDeleteId}
            setDialog={setDialog}
          />
        )}
        {view === "credits" && (
          <CreditsView
            tr={tr}
            heading={heading}
            demo={demo}
            price={price}
            setDialog={setDialog}
          />
        )}
      </main>
      <footer className="site-footer">
        <span>{tr("footer")}</span>
        <button type="button" onClick={() => setDialog("help")}>
          {tr("aboutDemo")}
          <Icon name="arrow" size={16} />
        </button>
      </footer>
      {dialog === "help" && (
        <Modal
          title={tr("aboutDemo")}
          closeLabel={tr("close")}
          onClose={() => setDialog(null)}
        >
          <p>{tr("demoHelp")}</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setDialog(null)}
          >
            {tr("close")}
          </button>
        </Modal>
      )}
      {dialog === "validate" && (
        <Modal
          title={tr("confirmTitle")}
          closeLabel={tr("close")}
          onClose={() => setDialog(null)}
        >
          <p>{tr("confirmHelp", { cost })}</p>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDialog(null)}
            >
              {tr("cancel")}
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={validate}
            >
              {tr("confirm", { cost })}
              <Icon name="check" size={18} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "preview" && (
        <Modal
          title={`${documentTypes[doc?.type ?? "BRIE"].label} · ${tr("page", { page })}`}
          closeLabel={tr("close")}
          onClose={() => setDialog(null)}
          wide
        >
          <Image
            className="full-preview"
            src={`/demo/${doc?.type ?? "BRIE"}-${page}.png`}
            alt={tr("pdfAlt", { type: doc?.type ?? "BRIE", page })}
            width={1131}
            height={1600}
            unoptimized
          />
        </Modal>
      )}
      {dialog === "print" && (
        <Modal
          title={tr("print")}
          closeLabel={tr("close")}
          onClose={() => setDialog(null)}
        >
          <p>{tr("printHelp")}</p>
          <a
            className="button button-primary"
            href={`/demo/${doc?.type ?? "BRIE"}-ejemplo.pdf`}
            target="_blank"
            rel="noreferrer"
          >
            {tr("openPdf")}
            <Icon name="arrow" size={18} />
          </a>
        </Modal>
      )}
      {dialog === "delete" && (
        <Modal
          title={tr("deleteTitle")}
          closeLabel={tr("close")}
          onClose={() => setDialog(null)}
        >
          <p>{tr("deleteHelp")}</p>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDialog(null)}
            >
              {tr("cancel")}
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                setDemo((s) => ({
                  ...s,
                  documents: s.documents.filter((d) => d.id !== deleteId),
                }));
                setDialog(null);
              }}
            >
              {tr("delete")}
            </button>
          </div>
        </Modal>
      )}
      {pack && (dialog === "basic" || dialog === "pro") && (
        <Modal
          title={tr("topupTitle")}
          closeLabel={tr("close")}
          onClose={() => setDialog(null)}
        >
          <p>
            {tr("topupHelp", {
              credits: pack.credits,
              price: price(pack.amountCents),
            })}
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDialog(null)}
            >
              {tr("cancel")}
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setDemo((s) => addTestCredits(s, dialog));
                setDialog(null);
                setNoticeValues({ credits: pack.credits });
                setNotice("topupStatus");
              }}
            >
              {tr("topupConfirm", { credits: pack.credits })}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
