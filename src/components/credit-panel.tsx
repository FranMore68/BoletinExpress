"use client";
import { useEffect, useRef, useState } from "react";
import { testPacks } from "@/modules/payments/packs";
import type { AccountLanguage } from "./account-shell";
import { accountRequest, errorKey } from "./account-shell";
export type Wallet = {
  balance: number;
  movements: {
    id: string;
    amount: number;
    balance_after: number;
    kind: "welcome" | "validation" | "renewal" | "topup";
    document_id: string | null;
    created_at: string;
  }[];
};
export function CreditPanel({
  wallet,
  language,
  refresh,
}: {
  wallet: Wallet;
  language: AccountLanguage;
  refresh: () => Promise<void>;
}) {
  const { tr, locale } = language;
  const [payments, setPayments] = useState<{
    available: boolean;
    purchases: { id: string; credits: number; status: string }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [returned, setReturned] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    accountRequest("/api/private/payments")
      .then((data) => {
        if (alive) setPayments(data);
      })
      .catch(() => {
        if (alive) setPayments(null);
      });
    const returned = new URLSearchParams(location.search).get("payment");
    if (returned === "returned" || returned === "cancelled") {
      setReturned(true);
      sessionStorage.removeItem("boletin-checkout-basic");
      sessionStorage.removeItem("boletin-checkout-pro");
    }
    return () => {
      alive = false;
    };
  }, []);
  async function update() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      await refresh();
      setPayments(await accountRequest("/api/private/payments"));
      setMessage(tr("paymentUpdated"));
    } catch (e) {
      setError(true);
      setMessage(tr(errorKey(e)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function checkout(pack: "basic" | "pro") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    setMessage("");
    const storage = `boletin-checkout-${pack}`;
    try {
      const requestId = sessionStorage.getItem(storage) || crypto.randomUUID();
      sessionStorage.setItem(storage, requestId);
      const result = await accountRequest("/api/private/payments/checkout", {
        pack,
        requestId,
        locale,
      });
      if (result.url) {
        location.assign(result.url);
        return;
      }
      sessionStorage.removeItem(storage);
      await refresh();
      setMessage(tr("paymentReturned"));
    } catch (e) {
      if (e instanceof Error && e.message === "conflict")
        sessionStorage.removeItem(storage);
      setError(true);
      setMessage(tr(errorKey(e)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="credit-panel" aria-label={tr("creditBalance")}>
      <p role="status">
        <strong>
          {tr("creditBalance")}: {wallet.balance} KC
        </strong>
      </p>
      <details open={returned || undefined}>
        <summary>{tr("recharge")}</summary>
        <p>{tr("paymentHelp")}</p>
        {payments?.available ? null : <p>{tr("payments_unavailable")}</p>}
        <div className="topup-actions">
          {(["basic", "pro"] as const).map((pack) => (
            <button
              key={pack}
              type="button"
              className="button button-primary"
              disabled={busy || !payments?.available}
              onClick={() => checkout(pack)}
            >
              {testPacks[pack].credits} KC ·{" "}
              {new Intl.NumberFormat(locale === "ca" ? "ca-ES" : "es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(testPacks[pack].amountCents / 100)}
            </button>
          ))}
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={update}
          >
            {tr("refreshPayments")}
          </button>
        </div>
        <p>{tr("paymentReturned")}</p>
        {payments && payments.purchases.length > 0 && (
          <ul>
            {payments.purchases.map((p) => (
              <li key={p.id}>
                {p.credits} KC ·{" "}
                {tr(
                  p.status === "paid"
                    ? "paymentPaid"
                    : p.status === "expired"
                      ? "paymentExpired"
                      : p.status === "failed"
                        ? "paymentFailed"
                        : "paymentPending",
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
      {message && <p role={error ? "alert" : "status"}>{message}</p>}
      <details>
        <summary>{tr("creditHistory")}</summary>
        <p>{tr("creditHelp")}</p>
        <ul>
          {wallet.movements.map((m) => (
            <li key={m.id}>
              <time dateTime={m.created_at}>
                {new Date(m.created_at).toLocaleString(
                  locale === "ca" ? "ca-ES" : "es-ES",
                )}
              </time>
              {" · "}
              {tr(
                m.kind === "welcome"
                  ? "welcomeCredit"
                  : m.kind === "renewal"
                    ? "renewalCredit"
                    : m.kind === "topup"
                      ? "topupCredit"
                      : "validationCredit",
              )}
              : {m.amount > 0 ? "+" : ""}
              {m.amount} KC ({m.balance_after} KC)
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
