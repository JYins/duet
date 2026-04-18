// device detection to route segmentation runtime

export type Runtime = "mediapipe" | "tfjs";

export function detectRuntime(): Runtime {
  if (typeof navigator === "undefined") return "mediapipe";

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // iOS Safari: MediaPipe WASM can crash on older devices,
  // TF.js WebGL backend is more stable and often faster
  if (isIOS || isSafari) return "tfjs";

  return "mediapipe";
}
