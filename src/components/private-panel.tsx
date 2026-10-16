"use client";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import {
  AccountShell,
  accountRequest,
  errorKey,
  useAccountLocale,
} from "./account-shell";

type Doc = {
  id: string;
  type: "BRIE" | "CIE";
  title: string;
  status: string;
  created_at: string;
};
type PrivateFile = { id: string; created_at: string };
export function PrivatePanel() {
  const language = useAccountLocale();
  const { tr, locale } = language;
  const [email, setEmail] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState<Doc | null>(null);
  const [files, setFiles] = useState<PrivateFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  const [notice, setNotice] = useState<AuthKey | null>(null);
  const load = useCallback(async () => {
    const [session, list] = await Promise.all([
      accountRequest("/api/auth/session"),
      accountRequest("/api/private/documents"),
    ]);
    setEmail(session.email);
    setDocs(list.documents);
    setLoading(false);
  }, []);
  useEffect(() => {
    load().catch((e) => {
      if (e instanceof Error && e.message === "session")
        location.replace("/acceso");
      else {
        setError(errorKey(e));
        setLoading(false);
      }
    });
  }, [load]);
  async function open(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await accountRequest(`/api/private/documents/${id}`);
      setActive(result.document);
      setFiles(result.files);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = event.currentTarget;
    const body = new FormData(form);
    try {
      const result = await accountRequest("/api/private/documents", {
        title: body.get("title"),
        type: body.get("type"),
      });
      form.reset();
      await load();
      setActive(result.document);
      setFiles([]);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !active) return;
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || !file.size) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/private/documents/${active.id}/files`,
        {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: file,
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      form.reset();
      await open(active.id);
      setNotice("uploaded");
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      await accountRequest("/api/auth/logout", {});
      location.replace(`/acceso?lang=${locale}`);
    } catch (e) {
      setError(errorKey(e));
      setBusy(false);
    }
  }
  return (
    <AccountShell language={language}>
      <section className="private-workspace">
        <div className="account-toolbar">
          <div>
            <p className="eyebrow">{tr("phase3")}</p>
            <p>{email}</p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={logout}
            disabled={busy}
          >
            {tr("logout")}
          </button>
        </div>
        <h1>{active ? active.title : tr("privateTitle")}</h1>
        <p>{tr("privateHelp")}</p>
        {error && (
          <p className="account-error" role="alert">
            {tr(error)}
          </p>
        )}
        {notice && <p role="status">{tr(notice)}</p>}
        {loading ? (
          <p role="status">{tr("loading")}</p>
        ) : active ? (
          <>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setActive(null);
                setError(null);
                setNotice(null);
              }}
            >
              {tr("back")}
            </button>
            <section className="private-block">
              <p className="eyebrow">{active.type}</p>
              <h2>{tr("files")}</h2>
              <p>{tr("filesHelp")}</p>
              <form onSubmit={upload}>
                <label htmlFor="private-file">{tr("file")}</label>
                <input
                  id="private-file"
                  name="file"
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                />
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={busy}
                >
                  {tr(busy ? "working" : "uploadButton")}
                </button>
              </form>
              {!files.length ? (
                <p>{tr("noFiles")}</p>
              ) : (
                <ul className="private-file-list">
                  {files.map((file, i) => (
                    <li key={file.id}>
                      <strong>PDF {i + 1}</strong>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`/api/private/files/${file.id}?view=1`}
                      >
                        {tr("preview")}
                      </a>
                      <a href={`/api/private/files/${file.id}`}>
                        {tr("download")}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
            <form className="private-create" onSubmit={create}>
              <h2>{tr("create")}</h2>
              <label htmlFor="private-title">{tr("title")}</label>
              <input name="title" id="private-title" required maxLength={100} />
              <label htmlFor="private-type">{tr("type")}</label>
              <select name="type" id="private-type">
                <option value="BRIE">BRIE</option>
                <option value="CIE">CIE ELEC-1</option>
              </select>
              <button
                type="submit"
                className="button button-primary"
                disabled={busy}
              >
                {tr(busy ? "working" : "create")}
              </button>
            </form>
            {docs.length ? (
              <ul className="private-doc-list">
                {docs.map((d) => (
                  <li key={d.id}>
                    <div>
                      <strong>{d.title}</strong>
                      <span>{d.type}</span>
                    </div>
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={busy}
                      onClick={() => open(d.id)}
                    >
                      {tr("open")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{tr("empty")}</p>
            )}
          </>
        )}
      </section>
    </AccountShell>
  );
}
