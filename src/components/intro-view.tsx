import type { Navigate, ScreenProps } from "./experience-types";
import { Icon } from "./icons";

export function IntroView({
  tr,
  heading,
  navigate,
}: ScreenProps & { navigate: Navigate }) {
  return (
    <section className="intro">
      <div className="intro-copy">
        <p className="eyebrow">BoletinExpress / 01</p>
        <h1 ref={heading} tabIndex={-1}>
          {tr("welcome")}
        </h1>
        <p className="lead">{tr("welcomeLead")}</p>
        <button
          type="button"
          className="button button-primary"
          onClick={() => navigate("choose")}
        >
          {tr("welcomeStart")}
          <Icon name="arrow" />
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => navigate("choose")}
        >
          {tr("skipIntro")}
        </button>
      </div>
      <div className="intro-steps">
        {(["collect", "correct", "review"] as const).map((key, i) => (
          <article key={key}>
            <span>0{i + 1}</span>
            <div>
              <h2>{tr(key)}</h2>
              <p>{tr(`${key}Note`)}</p>
            </div>
            <Icon
              name={i === 0 ? "audio" : i === 1 ? "text" : "document"}
              size={28}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
