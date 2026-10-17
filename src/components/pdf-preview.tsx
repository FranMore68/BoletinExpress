"use client";
import { useEffect, useRef, useState } from "react";

export function PdfPreview({
  url,
  label,
  failure,
  onRendered,
}: {
  url: string;
  label: string;
  failure: string;
  onRendered?: (receipt: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setFailed(false);
    onRendered?.(null);
    async function render() {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc =
        "/vendor/pdf.worker-6.4.299.min.mjs";
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        signal: abort.signal,
      });
      if (!response.ok) throw new Error("PDF unavailable");
      const receipt = response.headers.get("X-Boletin-Review");
      const task = pdfjs.getDocument({
        data: await response.arrayBuffer(),
      });
      cleanup = () => {
        void task.destroy();
      };
      if (cancelled) {
        cleanup();
        return;
      }
      const pdf = await task.promise;
      if (pdf.numPages !== 2) throw new Error("Unexpected page count");
      for (let n = 1; n <= pdf.numPages; n++) {
        if (cancelled || !container.current) return;
        const page = await pdf.getPage(n);
        if (cancelled || !container.current) return;
        const canvas = document.createElement("canvas");
        const viewport = page.getViewport({ scale: 1.6 });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `${label} (${n}/2)`);
        container.current.append(canvas);
        await page.render({ canvas, viewport }).promise;
      }
      if (!cancelled) onRendered?.(receipt);
    }
    void render().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      abort.abort();
      cleanup?.();
      container.current?.replaceChildren();
    };
  }, [url, label, onRendered]);
  return (
    <>
      <section className="pdf-pages" ref={container} aria-label={label} />
      {failed && <p role="alert">{failure}</p>}
    </>
  );
}
