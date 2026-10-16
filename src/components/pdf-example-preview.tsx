import Image from "next/image";
import type { DocumentType } from "@/modules/documents/catalog";
import type { Translate } from "./experience-types";
import { Icon } from "./icons";
export function PdfExamplePreview({
  type,
  page,
  setPage,
  onZoom,
  tr,
}: {
  type: DocumentType;
  page: number;
  setPage: (page: number) => void;
  onZoom: () => void;
  tr: Translate;
}) {
  return (
    <div className="preview">
      <div className="preview-toolbar">
        <span>{tr("page", { page })}</span>
        <div>
          <button
            className="icon-button"
            type="button"
            aria-label={tr("previousPage")}
            disabled={page === 1}
            onClick={() => setPage(1)}
          >
            <Icon name="arrow" style={{ transform: "rotate(180deg)" }} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={tr("nextPage")}
            disabled={page === 2}
            onClick={() => setPage(2)}
          >
            <Icon name="arrow" />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={tr("zoom")}
            onClick={onZoom}
          >
            <Icon name="eye" />
          </button>
        </div>
      </div>
      <div className="preview-canvas">
        <Image
          src={`/demo/${type}-${page}.png`}
          alt={tr("pdfAlt", { type: type, page })}
          width={1131}
          height={1600}
          unoptimized
        />
      </div>
      <p className="preview-caption">{tr("fixedPdf")}</p>
    </div>
  );
}
