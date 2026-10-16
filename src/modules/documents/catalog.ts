export const documentTypes = {
  BRIE: { label: "BRIE", creditCost: 2 },
  CIE: { label: "CIE ELEC-1", creditCost: 5 },
} as const;
export type DocumentType = keyof typeof documentTypes;
export type DocumentState = "draft" | "validated" | "email_only";
