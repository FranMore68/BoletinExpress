import type { RefObject } from "react";
import type { CopyKey } from "@/lib/i18n/copy";
import type { testPacks } from "@/modules/payments/packs";
export type View =
  | "landing"
  | "intro"
  | "choose"
  | "editor"
  | "review"
  | "done"
  | "documents"
  | "credits";
export type Method = "manual" | "text" | "voice" | "photo";
export type Dialog =
  | "help"
  | "validate"
  | "print"
  | "preview"
  | "delete"
  | keyof typeof testPacks
  | null;
export type Access = "register" | "enter";
export type Filter = "all" | "drafts" | "validatedPlural";
export type Navigate = (view: View, id?: string | null) => void;
export type Translate = (
  key: CopyKey,
  values?: Record<string, string | number>,
) => string;
export type ScreenProps = {
  tr: Translate;
  heading: RefObject<HTMLHeadingElement | null>;
};
