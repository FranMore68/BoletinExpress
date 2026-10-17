"use client";
import { type FormEvent, useEffect, useState } from "react";
import type { AuthKey } from "@/lib/i18n/auth-copy";
import {
  type FieldValues,
  profileFields,
} from "@/modules/documents/brie-schema";
import { cieFields } from "@/modules/documents/cie-schema";
import {
  type AccountLanguage,
  accountRequest,
  errorKey,
} from "./account-shell";
import { FormFields } from "./form-fields";

const profileSchema = profileFields.map((f) => {
  const source =
    f.key === "empresa_via_tipo"
      ? "CBO_TipusVia_2"
      : f.key === "installador_categoria"
        ? "TXT_Categoria"
        : null;
  return source
    ? {
        ...f,
        type: "enum" as const,
        choices: cieFields.find((c) => c.key === source)?.choices,
      }
    : f;
});
export function ProfilePanel({
  language,
  onBack,
}: {
  language: AccountLanguage;
  onBack: () => void;
}) {
  const { tr, locale } = language;
  const [fields, setFields] = useState<FieldValues>({});
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    accountRequest("/api/private/profile")
      .then((r) => {
        setFields(r.profile.fields);
        setRevision(r.profile.revision);
        setLoading(false);
      })
      .catch((e) => {
        setError(errorKey(e));
        setLoading(false);
      });
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || loading) return;
    setBusy(true);
    setError(null);
    try {
      const r = await accountRequest("/api/private/profile", {
        fields,
        revision,
      });
      setFields(r.profile.fields);
      setRevision(r.profile.revision);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="private-block">
      <h2>{tr("profile")}</h2>
      <p>{tr("profileHelp")}</p>
      <p>{tr("profileRetention")}</p>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => {
          if (!dirty || window.confirm(tr("unsavedConfirm"))) onBack();
        }}
        disabled={busy}
      >
        {tr("back")}
      </button>
      {loading ? (
        <p role="status">{tr("loading")}</p>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <FormFields
              schema={profileSchema}
              values={fields}
              locale={locale}
              prefix="profile"
              onChange={(v) => {
                setFields(v);
                setDirty(true);
                setSaved(false);
              }}
            />
            {error && (
              <p role="alert" className="account-error">
                {tr(error)}
              </p>
            )}
            {saved && <p role="status">{tr("profileSaved")}</p>}
            <button
              className="button button-primary"
              type="submit"
              disabled={!dirty}
            >
              {tr(busy ? "working" : "saveProfile")}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
