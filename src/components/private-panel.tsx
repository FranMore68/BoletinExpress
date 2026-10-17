"use client";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import type { FieldValues } from "@/modules/documents/brie-schema";
import {
  AccountShell,
  accountRequest,
  errorKey,
  useAccountLocale,
} from "./account-shell";
import { DocumentEditor } from "./document-editor";
import { ProfilePanel } from "./profile-panel";

type Doc = {
  id: string;
  type: "BRIE" | "CIE";
  title: string;
  status: string;
  created_at: string;
  work_data: FieldValues;
  revision: number;
};
export function PrivatePanel() {
  const heading = useRef<HTMLHeadingElement>(null);
  const language = useAccountLocale();
  const { tr, locale } = language;
  const [showProfile, setShowProfile] = useState(false);
  const [email, setEmail] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  const [notice, setNotice] = useState<AuthKey | null>(null);
  useEffect(() => {
    if (active?.id) heading.current?.focus({ preventScroll: true });
  }, [active?.id]);
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
        {!active && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setShowProfile(true)}
            disabled={busy}
          >
            {tr("profile")}
          </button>
        )}
        <h1 ref={heading} tabIndex={-1}>
          {active ? active.title : tr("privateTitle")}
        </h1>
        <p>{tr("privateHelp")}</p>
        {error && (
          <p className="account-error" role="alert">
            {tr(error)}
          </p>
        )}
        {notice && <p role="status">{tr(notice)}</p>}
        {showProfile ? (
          <ProfilePanel
            language={language}
            onBack={() => setShowProfile(false)}
          />
        ) : loading ? (
          <p role="status">{tr("loading")}</p>
        ) : active ? (
          <DocumentEditor
            key={active.id}
            document={active}
            model={active.type}
            language={language}
            onBack={() => {
              setActive(null);
              setError(null);
              setNotice(null);
            }}
          />
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
