export type PaperStyleId = "porcelain" | "milk" | "blush" | "sage" | "sky" | "charcoal";

export interface PaperStyle {
  id: PaperStyleId;
  label: string;
  color: string;
  ink: "dark" | "light";
}

export const PAPER_STYLES: PaperStyle[] = [
  { id: "porcelain", label: "porcelain", color: "#FBF7EF", ink: "dark" },
  { id: "milk", label: "milk", color: "#FFFDF8", ink: "dark" },
  { id: "blush", label: "blush", color: "#F8E8E5", ink: "dark" },
  { id: "sage", label: "sage", color: "#E7EDE4", ink: "dark" },
  { id: "sky", label: "sky", color: "#E8EEF6", ink: "dark" },
  { id: "charcoal", label: "charcoal", color: "#32312F", ink: "light" },
];

export function getPaperStyle(id?: string | null): PaperStyle {
  return PAPER_STYLES.find((style) => style.id === id) || PAPER_STYLES[0];
}
