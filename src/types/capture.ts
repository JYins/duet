import type { FrameLayout } from "@/lib/composite";
import type { LutPreset } from "@/lib/lut";

export type CapturePhase =
  | "ready"
  | "shooting"
  | "reviewing"
  | "selecting"
  | "uploading"
  | "waiting"
  | "compositing"
  | "done"
  | "error";

export interface CaptureShot {
  index: number;
  rawUrl: string;
  filteredUrl: string;
  selected: boolean;
}

export interface BoothSettings {
  layout: FrameLayout;
  lut: LutPreset;
  backgroundId: string;
  countdown: number;
  label: string;
  participantCount: number;
}
