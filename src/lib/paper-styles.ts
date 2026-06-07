export type PaperStyleId =
  | "porcelain"
  | "milk"
  | "blush"
  | "rose"
  | "butter"
  | "sage"
  | "mint"
  | "sky"
  | "lilac"
  | "pearl"
  | "ticket"
  | "charcoal";

export interface PaperStyle {
  id: PaperStyleId;
  label: string;
  color: string;
  accent: string;
  pattern: "plain" | "pearl" | "corner" | "ticket" | "check" | "night";
  ink: "dark" | "light";
}

export const PAPER_STYLES: PaperStyle[] = [
  { id: "porcelain", label: "porcelain", color: "#FBF7EF", accent: "#D9B88C", pattern: "plain", ink: "dark" },
  { id: "milk", label: "milk", color: "#FFFDF8", accent: "#CFC4B3", pattern: "pearl", ink: "dark" },
  { id: "blush", label: "blush", color: "#F8E8E5", accent: "#DFA6A8", pattern: "corner", ink: "dark" },
  { id: "rose", label: "rose", color: "#F3D7DD", accent: "#B97484", pattern: "ticket", ink: "dark" },
  { id: "butter", label: "butter", color: "#FFF1C8", accent: "#D2A84C", pattern: "corner", ink: "dark" },
  { id: "sage", label: "sage", color: "#E7EDE4", accent: "#92A982", pattern: "plain", ink: "dark" },
  { id: "mint", label: "mint", color: "#DFF3EA", accent: "#78A997", pattern: "check", ink: "dark" },
  { id: "sky", label: "sky", color: "#E8EEF6", accent: "#7F9FC3", pattern: "pearl", ink: "dark" },
  { id: "lilac", label: "lilac", color: "#EEE5F6", accent: "#9B82B3", pattern: "corner", ink: "dark" },
  { id: "pearl", label: "pearl", color: "#F7F4EA", accent: "#B9A989", pattern: "pearl", ink: "dark" },
  { id: "ticket", label: "ticket", color: "#F5E7D1", accent: "#B78352", pattern: "ticket", ink: "dark" },
  { id: "charcoal", label: "charcoal", color: "#32312F", accent: "#D0B488", pattern: "night", ink: "light" },
];

export function getPaperStyle(id?: string | null): PaperStyle {
  return PAPER_STYLES.find((style) => style.id === id) || PAPER_STYLES[0];
}
