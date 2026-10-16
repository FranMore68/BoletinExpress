import type { DocumentType } from "@/modules/documents/catalog";
import { documentTypes } from "@/modules/documents/catalog";
import type { ScreenProps } from "./experience-types";
import { Icon } from "./icons";

export function ChooseView({
  tr,
  heading,
  start,
}: ScreenProps & { start: (type: DocumentType) => void }) {
  return (
    <section className="choose">
      <div className="page-heading">
        <p className="eyebrow">BRIE / CIE ELEC-1</p>
        <h1 ref={heading} tabIndex={-1}>
          {tr("chooseTitle")}
        </h1>
        <p className="lead">{tr("chooseLead")}</p>
      </div>
      <div className="document-choice">
        {(["BRIE", "CIE"] as const).map((type, i) => (
          <article key={type} className={i ? "choice-cie" : "choice-brie"}>
            <div className="choice-top">
              <Icon name="document" size={42} />
              <span>0{i + 1}</span>
            </div>
            <h2>{documentTypes[type].label}</h2>
            <p>{tr(type === "BRIE" ? "brieName" : "cieName")}</p>
            <div className="choice-cost">
              <strong>
                {documentTypes[type].creditCost} <small>KC</small>
              </strong>
              <span>{tr("costNote")}</span>
            </div>
            <button
              type="button"
              className="button button-primary full"
              onClick={() => start(type)}
            >
              {tr("choose", { type: documentTypes[type].label })}
              <Icon name="arrow" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
