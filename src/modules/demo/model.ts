import { type DocumentType, documentTypes } from "../documents/catalog.ts";
import { testPacks } from "../payments/packs.ts";
export type Fields = {
  holder: string;
  identifier: string;
  address: string;
  power: string;
  use: string;
  notes: string;
};
export type Field = keyof Fields;
export type DemoDocument = {
  id: string;
  type: DocumentType;
  data: Fields;
  edited: Field[];
  proposed: boolean;
  validated: boolean;
};
export type DemoState = {
  credits: number;
  nextId: number;
  documents: DemoDocument[];
  movements: {
    id: string;
    kind: "trial" | "validation" | "topup";
    amount: number;
    type?: DocumentType;
  }[];
};
export const initialDemo = (): DemoState => ({
  credits: 10,
  nextId: 1,
  documents: [],
  movements: [{ id: "trial", kind: "trial", amount: 10 }],
});
export function createDraft(state: DemoState, type: DocumentType): DemoState {
  if (state.documents.filter((d) => !d.validated).length >= 3)
    throw new Error("draftLimit");
  const doc: DemoDocument = {
    id: `BE-DEMO-${String(state.nextId).padStart(3, "0")}`,
    type,
    data: {
      holder: "",
      identifier: "",
      address: "",
      power: "",
      use: "",
      notes: "",
    },
    edited: [],
    proposed: false,
    validated: false,
  };
  return {
    ...state,
    nextId: state.nextId + 1,
    documents: [...state.documents, doc],
  };
}
export function editField(
  doc: DemoDocument,
  name: Field,
  value: string,
): DemoDocument {
  if (doc.validated) return doc;
  return {
    ...doc,
    data: { ...doc.data, [name]: value },
    edited: [...new Set([...doc.edited, name])],
  };
}
export function applyExample(doc: DemoDocument, example: Fields): DemoDocument {
  if (doc.validated) return doc;
  const data = { ...example };
  for (const name of doc.edited) data[name] = doc.data[name];
  return { ...doc, data, proposed: true };
}
export function missingFields(data: Fields): Field[] {
  const missing: Field[] = [];
  if (!data.holder.trim()) missing.push("holder");
  if (!data.address.trim()) missing.push("address");
  const power = Number(data.power.replace(",", "."));
  if (!Number.isFinite(power) || power <= 0) missing.push("power");
  return missing;
}
export function validateExample(state: DemoState, id: string): DemoState {
  const doc = state.documents.find((d) => d.id === id);
  if (!doc || doc.validated) return state;
  if (missingFields(doc.data).length) throw new Error("incomplete");
  const cost = documentTypes[doc.type].creditCost;
  if (state.credits < cost) throw new Error("insufficient");
  return {
    ...state,
    credits: state.credits - cost,
    documents: state.documents.map((d) =>
      d.id === id ? { ...d, validated: true } : d,
    ),
    movements: [
      ...state.movements,
      {
        id: `validation-${doc.id}`,
        kind: "validation",
        amount: -cost,
        type: doc.type,
      },
    ],
  };
}
export function addTestCredits(
  state: DemoState,
  pack: keyof typeof testPacks,
): DemoState {
  const amount = testPacks[pack].credits;
  return {
    ...state,
    credits: state.credits + amount,
    movements: [
      ...state.movements,
      { id: `topup-${state.movements.length}`, kind: "topup", amount },
    ],
  };
}
