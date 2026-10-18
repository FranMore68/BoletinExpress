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
import { CreditPanel, type Wallet } from "./credit-panel";
import { DocumentEditor } from "./document-editor";
import { ProfilePanel } from "./profile-panel";
import { ValidatedDocument } from "./validated-document";

type Doc = {
  id: string;
  type: "BRIE" | "CIE";
  title: string;
  status: string;
  created_at: string;
  work_data: FieldValues;
  revision: number;
  validated_at: string | null;
  draft_expires_at: string | null;
  renewal_active: boolean;
};
export function PrivatePanel() {
  const heading = useRef<HTMLHeadingElement>(null);
  const language = useAccountLocale();
  const { tr, locale } = language;
  const [showProfile, setShowProfile] = useState(false);
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState<Doc | null>(null);
  const [documentTime, setDocumentTime] = useState<string>(
    new Date().toISOString(),
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  const [notice, setNotice] = useState<AuthKey | null>(null);
  useEffect(() => {
    if (active?.id) heading.current?.focus({ preventScroll: true });
  }, [active?.id]);
  const load = useCallback(async () => {
    const [session, list, credits] = await Promise.all([
      accountRequest("/api/auth/session"),
      accountRequest("/api/private/documents"),
      accountRequest("/api/private/credits"),
    ]);
    setEmail(session.email);
    setWallet(credits);
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
      await accountRequest(`/api/private/documents/${id}/activity`, {});
      const result = await accountRequest(`/api/private/documents/${id}`);
      setDocumentTime(result.documentTime);
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
        {wallet && <CreditPanel wallet={wallet} language={language} />}
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
        {active?.status !== "validated" && <p>{tr("retentionHelp")}</p>}
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
        ) : active?.status === "validated" ? (
          <ValidatedDocument
            id={active.id}
            validatedAt={active.validated_at || new Date().toISOString()}
            documentTime={documentTime}
            language={language}
            onBack={() => setActive(null)}
          />
        ) : active ? (
          <DocumentEditor
            key={active.id}
            document={active}
            model={active.type}
            onValidated={async () => {
              // Closing is already committed; never restore an editable document if refreshing the list fails.
              setActive({
                ...active,
                status: "validated",
                work_data: {},
                validated_at: new Date().toISOString(),
              });
              setWallet(null);
              try {
                await load();
                const closed = await accountRequest(
                  `/api/private/documents/${active.id}`,
                );
                setActive(closed.document);
                setDocumentTime(closed.documentTime);
              } catch (e) {
                setError(errorKey(e));
              }
            }}
            language={language}
            onBack={() => {
              setActive(null);
              void load().catch((e) => setError(errorKey(e)));
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
                      <span>
                        {d.type} ·{" "}
                        {tr(
                          d.status === "validated"
                            ? "validatedStatus"
                            : "draftStatus",
                        )}
                      </span>
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
