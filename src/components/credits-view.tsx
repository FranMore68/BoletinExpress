import type { DemoState } from "@/modules/demo/model";
import { testPacks } from "@/modules/payments/packs";
import type { Dialog, ScreenProps } from "./experience-types";
import { Icon } from "./icons";

export function CreditsView({
  tr,
  heading,
  demo,
  price,
  setDialog,
}: ScreenProps & {
  demo: DemoState;
  price: (amount: number) => string;
  setDialog: (dialog: Dialog) => void;
}) {
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">{tr("creditEyebrow")}</p>
        <h1 ref={heading} tabIndex={-1}>
          {tr("creditTitle")}
        </h1>
        <p className="lead">{tr("creditLead")}</p>
      </div>
      <div className="credits-layout">
        <aside className="credit-balance">
          <Icon name="wallet" size={32} />
          <span>{tr("balance")}</span>
          <strong>
            {demo.credits}
            <small>KC</small>
          </strong>
          <p>{tr("demo")}</p>
        </aside>
        <div className="pack-grid">
          {(["basic", "pro"] as const).map((key) => (
            <article
              key={key}
              className={key === "pro" ? "pack pack-pro" : "pack"}
            >
              <span className="eyebrow">{tr(key)}</span>
              <h2>
                {testPacks[key].credits} <small>KC</small>
              </h2>
              <p className="pack-price">{price(testPacks[key].amountCents)}</p>
              <p className="muted">{tr("packNote")}</p>
              <button
                type="button"
                className="button button-primary full"
                onClick={() => setDialog(key)}
              >
                {tr("pickPack", { credits: testPacks[key].credits })}
              </button>
            </article>
          ))}
        </div>
      </div>
      <section className="movements">
        <h2>{tr("movements")}</h2>
        <ul>
          {demo.movements.toReversed().map((movement) => (
            <li key={movement.id}>
              <span>
                {movement.kind === "trial"
                  ? tr("trial")
                  : movement.kind === "topup"
                    ? tr("topupMovement")
                    : tr("validationMovement", {
                        type: movement.type ?? "",
                      })}
              </span>
              <strong>
                {movement.amount > 0 ? "+" : ""}
                {movement.amount} KC
              </strong>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
