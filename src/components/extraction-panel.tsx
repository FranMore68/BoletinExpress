"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import type { FieldValues, FormField } from "@/modules/documents/brie-schema";
import { audioWav } from "@/modules/extraction/audio";
import { photoJpeg } from "@/modules/extraction/photo";
import {
  type AccountLanguage,
  accountRequest,
  errorKey,
} from "./account-shell";

type Proposal = {
  key: string;
  value: string | boolean;
  evidence: string;
  uncertain: boolean;
};
type Extraction = {
  id: string;
  kind: string;
  state: string;
  result: { fields: Proposal[]; issues: string[] } | null;
  transcription: string | null;
  error: string | null;
  attempts: number;
};
const copy = {
  title: ["Aportar datos con IA", "Aporta dades amb IA"],
  help: [
    "Las propuestas no se guardan en el formulario hasta que las revises y aceptes. La IA no certifica la instalación.",
    "Les propostes no es desen al formulari fins que les revisis i acceptis. La IA no certifica la instal·lació.",
  ],
  limits: [
    "Por documento: 5 fotos, 5 audios de hasta 60 s y 10 extracciones. Por cuenta y día UTC: 10 extracciones y 5 minutos de audio. Cada solicitud nueva consume cuota; reintentar la misma operación no vuelve a consumirla.",
    "Per document: 5 fotos, 5 àudios de fins a 60 s i 10 extraccions. Per compte i dia UTC: 10 extraccions i 5 minuts d’àudio. Cada sol·licitud nova consumeix quota; reintentar la mateixa operació no en torna a consumir.",
  ],
  text: ["Notas de la instalación", "Notes de la instal·lació"],
  extract: ["Extraer del texto", "Extreu del text"],
  photo: [
    "Foto o cámara (JPEG, PNG o WebP; se optimiza antes de subir)",
    "Foto o càmera (JPEG, PNG o WebP; s’optimitza abans de pujar)",
  ],
  audio: ["Subir audio (máximo 60 segundos)", "Puja àudio (màxim 60 segons)"],
  record: ["Grabar voz", "Enregistra veu"],
  stop: ["Detener grabación", "Atura la gravació"],
  pending: ["Procesando…", "Processant…"],
  ready: ["Propuestas para revisar", "Propostes per revisar"],
  protected: [
    "Protegido: ya contiene datos o fue corregido manualmente.",
    "Protegit: ja conté dades o s’ha corregit manualment.",
  ],
  uncertain: [
    "Dato dudoso: comprueba la fuente e introdúcelo manualmente en el formulario.",
    "Dada dubtosa: comprova la font i introdueix-la manualment al formulari.",
  ],
  accept: [
    "Aceptar los campos seleccionados",
    "Accepta els camps seleccionats",
  ],
  retry: ["Reintentar esta operación", "Reintenta aquesta operació"],
  save: [
    "Guarda tus cambios manuales antes de usar o aceptar propuestas.",
    "Desa els canvis manuals abans d’utilitzar o acceptar propostes.",
  ],
  source: ["Abrir fuente privada", "Obre la font privada"],
  none: [
    "No se han identificado campos seguros. Completa los datos manualmente.",
    "No s’han identificat camps segurs. Completa les dades manualment.",
  ],
  unavailable: [
    "La extracción no está configurada.",
    "L’extracció no està configurada.",
  ],
  permission: [
    "No se ha podido acceder al micrófono. Puedes subir un audio o escribir las notas.",
    "No s’ha pogut accedir al micròfon. Pots pujar un àudio o escriure les notes.",
  ],
  transcript: [
    "Transcripción pendiente de revisión",
    "Transcripció pendent de revisió",
  ],
  review: [
    "He comprobado los campos seleccionados con la fuente.",
    "He comprovat els camps seleccionats amb la font.",
  ],
} as const;
export function ExtractionPanel({
  documentId,
  revision,
  fields,
  schema,
  dirty,
  disabled,
  language,
  onApplied,
  onApplying,
}: {
  documentId: string;
  revision: number;
  fields: FieldValues;
  schema: FormField[];
  dirty: boolean;
  disabled: boolean;
  language: AccountLanguage;
  onApplying: (busy: boolean) => void;
  onApplied: (document: {
    work_data: FieldValues;
    revision: number;
    draft_expires_at?: string | null;
  }) => void;
}) {
  const ca = language.locale === "ca" ? 1 : 0;
  const t = (key: keyof typeof copy) => copy[key][ca];
  const base = `/api/private/documents/${documentId}/extractions`;
  const [items, setItems] = useState<Extraction[]>([]),
    [manual, setManual] = useState<string[]>([]),
    [available, setAvailable] = useState(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<AuthKey | null>(null),
    [microphoneError, setMicrophoneError] = useState(false),
    [recording, setRecording] = useState(false),
    [selected, setSelected] = useState<Record<string, string[]>>({}),
    [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const r = await accountRequest(`${base}?revision=${revision}`);
    setItems(r.extractions);
    setManual(r.manualKeys || []);
    setAvailable(r.available);
  }, [base, revision]);
  useEffect(() => {
    refresh().catch((e) => setError(errorKey(e)));
  }, [refresh]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => {
        t.stop();
      });
      if (recorder.current?.state === "recording") recorder.current.stop();
    };
  }, []);
  const pending = items.some((i) =>
    ["upload", "pending", "processing"].includes(i.state),
  );
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(
      () => refresh().catch((e) => setError(errorKey(e))),
      2500,
    );
    return () => clearInterval(id);
  }, [pending, refresh]);
  const blocked = (p: Proposal) =>
    manual.includes(p.key) ||
    (Object.hasOwn(fields, p.key) && fields[p.key] !== "");
  async function submit(blob?: Blob) {
    if (busy || dirty || disabled || !available) return;
    setBusy(true);
    setError(null);
    try {
      const buffer = blob
        ? await blob.arrayBuffer()
        : new TextEncoder().encode(text).buffer;
      const hash =
        Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
        )
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("") + (blob?.type || "text");
      if (operation.current?.fingerprint !== hash) {
        const storageKey = `boletin-extraction-${documentId}-${hash}`;
        const id = sessionStorage.getItem(storageKey) || crypto.randomUUID();
        sessionStorage.setItem(storageKey, id);
        operation.current = { fingerprint: hash, id };
      }
      const requestId = operation.current.id;
      if (blob) {
        const r = await fetch(`${base}?lang=${language.locale}`, {
          method: "POST",
          headers: { "Content-Type": blob.type, "X-Request-ID": requestId },
          body: blob,
          credentials: "same-origin",
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error || "unavailable");
      } else
        await accountRequest(`${base}?lang=${language.locale}`, {
          text,
          requestId,
        });
      await refresh();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function record() {
    setMicrophoneError(false);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        s.getTracks().forEach((t) => {
          t.stop();
        });
        return;
      }
      stream.current = s;
      const r = new MediaRecorder(s);
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = async () => {
        if (timer.current) clearTimeout(timer.current);
        s.getTracks().forEach((t) => {
          t.stop();
        });
        if (!mounted.current) return;
        setRecording(false);
        try {
          await submit(await audioWav(new Blob(chunks, { type: r.mimeType })));
        } catch (e) {
          setError(errorKey(e));
        }
      };
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 59000);
    } catch {
      setMicrophoneError(true);
    }
  }
  async function apply(item: Extraction) {
    setBusy(true);
    onApplying(true);
    setError(null);
    try {
      const r = await accountRequest(`${base}/apply`, {
        jobId: item.id,
        keys: selected[item.id] || [],
        revision,
      });
      onApplied(r.document);
      setSelected({});
      setReviewed({});
      await refresh();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
      onApplying(false);
    }
  }
  return (
    <section className="extraction-panel private-block">
      <h3>{t("title")}</h3>
      <p>{t("help")}</p>
      <p>{t("limits")}</p>
      {!available && <p role="status">{t("unavailable")}</p>}
      {dirty && <p role="status">{t("save")}</p>}
      <fieldset disabled={busy || disabled || dirty || !available || recording}>
        <label>
          {t("text")}
          <textarea
            maxLength={6000}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="button button-secondary"
          disabled={!text.trim()}
          onClick={() => submit()}
        >
          {t("extract")}
        </button>
        <label>
          {t("photo")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                try {
                  setBusy(true);
                  const photo = await photoJpeg(f);
                  setBusy(false);
                  await submit(photo);
                } catch (x) {
                  setBusy(false);
                  setError(errorKey(x));
                }
            }}
          />
        </label>
        <label>
          {t("audio")}
          <input
            type="file"
            accept="audio/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                try {
                  setBusy(true);
                  const wav = await audioWav(f);
                  setBusy(false);
                  await submit(wav);
                } catch (x) {
                  setBusy(false);
                  setError(errorKey(x));
                }
            }}
          />
        </label>
      </fieldset>
      <button
        type="button"
        className="button button-secondary"
        disabled={busy || dirty || disabled || !available}
        onClick={() => {
          if (recording) recorder.current?.stop();
          else void record();
        }}
      >
        {t(recording ? "stop" : "record")}
      </button>
      {microphoneError && <p role="alert">{t("permission")}</p>}
      {error && (
        <p role="alert" className="account-error">
          {language.tr(error)}
        </p>
      )}
      <div aria-live="polite">
        {items.map((item) => (
          <article key={item.id} className="extraction-result">
            <h4>
              {item.kind === "photo"
                ? t("photo")
                : item.kind === "audio"
                  ? t("audio")
                  : t("text")}
            </h4>
            {["upload", "pending", "processing"].includes(item.state) && (
              <p>{t("pending")}</p>
            )}
            {item.kind !== "text" && (
              <a
                href={`${base}/source?job=${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("source")}
              </a>
            )}
            {item.state === "failed" && (
              <>
                <p role="alert">
                  {language.tr(
                    errorKey(new Error(item.error || "unavailable")),
                  )}
                </p>
                {item.attempts > 0 && item.attempts < 3 && (
                  <button
                    type="button"
                    disabled={busy || dirty || disabled}
                    onClick={async () => {
                      try {
                        await accountRequest(base, { retry: item.id });
                        await refresh();
                      } catch (e) {
                        setError(errorKey(e));
                      }
                    }}
                  >
                    {t("retry")}
                  </button>
                )}
              </>
            )}
            {item.transcription && (
              <details>
                <summary>{t("transcript")}</summary>
                <p>{item.transcription}</p>
              </details>
            )}
            {item.state === "ready" && item.result && (
              <>
                <p>{t("ready")}</p>
                {Array.from(new Set(item.result.issues)).map((issue) => (
                  <p
                    key={`${item.id}-issue-${issue}`}
                    className="account-error"
                  >
                    {issue}
                  </p>
                ))}
                {!item.result.fields.length && <p>{t("none")}</p>}
                {item.result.fields.map((p) => (
                  <div key={p.key} className="extraction-proposal">
                    <label>
                      <input
                        type="checkbox"
                        disabled={
                          blocked(p) || p.uncertain || dirty || busy || disabled
                        }
                        checked={(selected[item.id] || []).includes(p.key)}
                        onChange={(e) => {
                          setSelected((s) => ({
                            ...s,
                            [item.id]: e.target.checked
                              ? [...(s[item.id] || []), p.key]
                              : (s[item.id] || []).filter((k) => k !== p.key),
                          }));
                          setReviewed((s) => ({ ...s, [item.id]: false }));
                        }}
                      />
                      {schema.find((f) => f.key === p.key)?.label[ca] || p.key}:{" "}
                      <strong>
                        {typeof p.value === "boolean"
                          ? p.value
                            ? "Sí"
                            : ca
                              ? "No"
                              : "No"
                          : p.value}
                      </strong>
                    </label>
                    <p>“{p.evidence}”</p>
                    {blocked(p) && <p>{t("protected")}</p>}
                    {p.uncertain && (
                      <p className="account-error">{t("uncertain")}</p>
                    )}
                  </div>
                ))}
                <label>
                  <input
                    type="checkbox"
                    disabled={dirty || busy || disabled}
                    checked={!!reviewed[item.id]}
                    onChange={(e) =>
                      setReviewed((s) => ({
                        ...s,
                        [item.id]: e.target.checked,
                      }))
                    }
                  />
                  {t("review")}
                </label>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={
                    dirty ||
                    busy ||
                    disabled ||
                    !reviewed[item.id] ||
                    !selected[item.id]?.length
                  }
                  onClick={() => apply(item)}
                >
                  {t("accept")}
                </button>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
