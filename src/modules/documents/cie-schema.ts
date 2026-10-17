import {
  type FieldValues,
  type FormField,
  normalizeFields,
} from "./brie-schema.ts";
import fields from "./cie-fields.json" with { type: "json" };
export type CieField = FormField & {
  postal?: boolean;
  condition?: { key: string; values?: string[]; not?: string[] };
};
export const cieFields = fields as unknown as CieField[];
export function cieFieldActive(f: CieField, values: FieldValues) {
  if (!f.condition) return true;
  const value = String(values[f.condition.key] ?? "");
  return f.condition.values
    ? f.condition.values.includes(value)
    : !f.condition.not?.includes(value);
}
export function activeCieValues(values: FieldValues): FieldValues {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => {
      const f = cieFields.find((f) => f.key === key);
      return f && cieFieldActive(f, values);
    }),
  );
}
export function cieIssues(values: FieldValues): string[] {
  return cieFields
    .filter((f) => {
      const v = values[f.key];
      if (v === undefined || v === "") return false;
      return (
        !cieFieldActive(f, values) ||
        (f.postal && (typeof v !== "string" || !/^\d{5}$/.test(v))) ||
        (f.type === "enum" && !f.choices?.some((c) => c.value === v))
      );
    })
    .map((f) => f.key);
}
export function normalizeCieFields(value: unknown) {
  const normalized = normalizeFields(value, cieFields);
  if (cieIssues(normalized).length) throw new Error("input");
  return normalized;
}
