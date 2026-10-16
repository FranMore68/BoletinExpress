import type { RefObject } from "react";
import type { Locale } from "@/lib/i18n/copy";
import type { DemoState } from "@/modules/demo/model";
import { documentTypes } from "@/modules/documents/catalog";
import type { Access, Navigate, ScreenProps } from "./experience-types";
import { Icon } from "./icons";

export function LandingView({
  tr,
  locale,
  heading,
  wheel,
  access,
  setAccess,
  navigate,
  demo,
}: ScreenProps & {
  locale: Locale;
  wheel: RefObject<HTMLDivElement | null>;
  access: Access;
  setAccess: (value: Access) => void;
  navigate: Navigate;
  demo: DemoState;
}) {
  return (
    <div className="landing-layout">
      <div className="landing-story">
        <section className="hero">
          <div className="hero-wheel" ref={wheel} aria-hidden="true">
            <div className="wheel-half" />
            <div className="wheel-line" />
            <div className="wheel-square" />
            <div className="wheel-dot" />
          </div>
          <p className="eyebrow">
            <span />
            {tr("forWhom")}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {tr("landingTitle")}
          </h1>
          <p className="hero-lead">{tr("landingLead")}</p>
          <div className="hero-mark">
            <span>BRIE</span>
            <span>CIE ELEC-1</span>
            <span>ES / CA</span>
          </div>
          <div className="paper-scene" aria-hidden="true">
            <div className="scene-circle" />
            <div className="scene-paper">
              <span className="paper-tag">BRIE / CIE</span>
              <strong>{tr("prepared")}</strong>
              <div className="paper-row">
                <span />
                <i />
              </div>
              <div className="paper-row">
                <span />
                <i />
              </div>
              <div className="paper-row short">
                <span />
                <i />
              </div>
              <div className="paper-stamp">
                <Icon name="check" size={16} />
                {tr("reviewedByYou")}
              </div>
            </div>
            <div className="scene-check">
              <Icon name="check" size={34} />
            </div>
          </div>
        </section>
        <section id="how" className="how-section">
          <p className="eyebrow">01 — {tr("how")}</p>
          <h2>{tr("howTitle")}</h2>
          <div className="how-cards">
            {(["collect", "correct", "review"] as const).map((key, i) => (
              <article key={key}>
                <span className="step-number">0{i + 1}</span>
                <h3>{tr(key)}</h3>
                <p>{tr(`${key}Note`)}</p>
                <Icon
                  name={i === 0 ? "text" : i === 1 ? "check" : "document"}
                  size={34}
                />
              </article>
            ))}
          </div>
        </section>
        <section id="models" className="models-section">
          <p className="eyebrow">02 — BRIE / CIE ELEC-1</p>
          <h2>{tr("offered")}</h2>
          <div className="model-mini-grid">
            {(["BRIE", "CIE"] as const).map((type) => (
              <article key={type}>
                <Icon name="document" size={30} />
                <h3>{documentTypes[type].label}</h3>
                <p>{tr(type === "BRIE" ? "brieName" : "cieName")}</p>
                <div>
                  <strong>{documentTypes[type].creditCost} KC</strong>
                  <span>{tr("costNote")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <aside className="access-column">
        <section className="access-card" id="access">
          <div className="trial-label">
            <span className="trial-symbol">10</span>
            <span>{tr("free")}</span>
          </div>
          <fieldset className="access-tabs" aria-label={tr("enter")}>
            {(["register", "enter"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={access === mode}
                onClick={() => setAccess(mode)}
              >
                {tr(mode)}
              </button>
            ))}
          </fieldset>
          <h2>{tr(access === "register" ? "register" : "enter")}</h2>
          <p>{tr("accessNote")}</p>
          <label htmlFor="demo-email">{tr("email")}</label>
          <input
            id="demo-email"
            value="demo@example.invalid"
            readOnly
            type="email"
          />
          <button
            type="button"
            className="button button-primary full"
            onClick={() =>
              navigate(
                access === "register" &&
                  !demo.documents.length &&
                  demo.credits === 10
                  ? "intro"
                  : "documents",
              )
            }
          >
            {tr(access === "register" ? "startTrial" : "demoEnter")}
            <Icon name="arrow" size={18} />
          </button>
          <a
            className="button button-secondary full"
            href={`/acceso?lang=${locale}`}
          >
            {tr("realAccess")}
          </a>
          <p className="access-foot">{tr("accessFoot")}</p>
          <div className="access-demo">{tr("demo")}</div>
        </section>
      </aside>
    </div>
  );
}
