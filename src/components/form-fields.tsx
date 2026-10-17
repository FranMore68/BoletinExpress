"use client";
import type { Locale } from "@/lib/i18n/copy";
import type { FieldValues, FormField } from "@/modules/documents/brie-schema";

const sections: Record<string, readonly [string, string]> = {
  company: ["Empresa instaladora", "Empresa instal·ladora"],
  installer: ["Persona instaladora", "Persona instal·ladora"],
  address: [
    "Dirección y contacto de la empresa (CIE)",
    "Adreça i contacte de l’empresa (CIE)",
  ],
  classification: ["Actuación, requisitos y uso", "Actuació, requisits i ús"],
  professional: ["Empresa e instalador", "Empresa i instal·lador"],
  premises: ["Local y emplazamiento", "Local i emplaçament"],
  holder: ["Titular", "Titular"],
  technical: [
    "Trabajo y características técnicas",
    "Treball i característiques tècniques",
  ],
  linkTechnical: [
    "Para instalaciones de enlace",
    "Per a instal·lacions d’enllaç",
  ],
  generation: [
    "Para instalaciones generadoras",
    "Per a instal·lacions generadores",
  ],
  supply: ["Suministro complementario", "Subministrament complementari"],
  declaration: ["Datos de la declaración", "Dades de la declaració"],
  defects: [
    "Página 2: defectos y comentarios",
    "Pàgina 2: defectes i comentaris",
  ],
};
export function FormFields({
  schema,
  values,
  onChange,
  locale,
  prefix,
  errors = [],
}: {
  schema: FormField[];
  values: FieldValues;
  onChange: (v: FieldValues) => void;
  locale: Locale;
  prefix: string;
  errors?: string[];
}) {
  const lang = locale === "ca" ? 1 : 0;
  function change(field: FormField, value: string) {
    const next = { ...values };
    if (field.type === "boolean") {
      if (value === "") delete next[field.key];
      else next[field.key] = value === "true";
    } else next[field.key] = value;
    onChange(next);
  }
  return (
    <>
      {[...new Set(schema.map((f) => f.section))].map((section) => (
        <fieldset className="data-section" key={section}>
          <legend>{sections[section][lang]}</legend>
          {section === "generation" && (
            <p>
              {lang
                ? "No s’ha d’emplenar per a subministraments complementaris, que formen part de la instal·lació receptora."
                : "No se rellena para suministros complementarios, que forman parte de la instalación receptora."}
            </p>
          )}
          <div className="data-grid">
            {schema
              .filter((f) => f.section === section)
              .map((f) => {
                const id = `${prefix}-${f.key}`;
                const selected = f.choices?.find(
                  (c) => c.value === values[f.key],
                )?.label[lang];
                const describeSelection = Boolean(
                  selected && selected.length > 70,
                );
                return (
                  <div
                    key={f.key}
                    className={
                      f.type === "multiline"
                        ? "data-field data-wide"
                        : "data-field"
                    }
                  >
                    <label htmlFor={id}>{f.label[lang]}</label>
                    {f.type === "boolean" || f.type === "enum" ? (
                      <select
                        id={id}
                        aria-describedby={
                          describeSelection ? `${id}-selection` : undefined
                        }
                        value={String(values[f.key] ?? "")}
                        onChange={(e) => change(f, e.target.value)}
                        aria-invalid={errors.includes(f.key)}
                      >
                        <option value="">
                          {lang ? "Sense indicar" : "Sin indicar"}
                        </option>
                        {f.type === "enum" &&
                          values[f.key] &&
                          !f.choices?.some(
                            (c) => c.value === values[f.key],
                          ) && (
                            <option value={String(values[f.key])}>
                              {String(values[f.key])} (
                              {lang
                                ? "revisa aquesta opció"
                                : "revisa esta opción"}
                              )
                            </option>
                          )}
                        {f.type === "boolean" ? (
                          <>
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </>
                        ) : (
                          f.choices
                            ?.filter((c) => c.value !== "0")
                            .map((c) => (
                              <option value={c.value} key={c.value}>
                                {c.label[lang]}
                              </option>
                            ))
                        )}
                      </select>
                    ) : f.type === "multiline" ? (
                      <textarea
                        id={id}
                        rows={3}
                        maxLength={f.max || 180}
                        value={String(values[f.key] ?? "")}
                        onChange={(e) => change(f, e.target.value)}
                        aria-invalid={errors.includes(f.key)}
                      />
                    ) : (
                      <input
                        id={id}
                        type="text"
                        maxLength={f.max || 180}
                        value={String(values[f.key] ?? "")}
                        onChange={(e) => change(f, e.target.value)}
                        aria-invalid={errors.includes(f.key)}
                      />
                    )}
                    {describeSelection && (
                      <p id={`${id}-selection`} className="field-selection">
                        {selected}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </fieldset>
      ))}
    </>
  );
}
