"use client";
import type { AccountLanguage } from "./account-shell";
export type Wallet = {
  balance: number;
  movements: {
    id: string;
    amount: number;
    balance_after: number;
    kind: "welcome" | "validation" | "renewal";
    document_id: string | null;
    created_at: string;
  }[];
};
export function CreditPanel({
  wallet,
  language,
}: {
  wallet: Wallet;
  language: AccountLanguage;
}) {
  const { tr, locale } = language;
  return (
    <section className="credit-panel" aria-label={tr("creditBalance")}>
      <p role="status">
        <strong>
          {tr("creditBalance")}: {wallet.balance} KC
        </strong>
      </p>
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
