// camera access and capture utilities

export type FacingMode = "user" | "environment";

export const CAPTURE_WIDTH = 900;
export const CAPTURE_HEIGHT = 1200;

export async function getStream(facing: FacingMode = "user") {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: facing,
      width: { ideal: CAPTURE_WIDTH },
      height: { ideal: CAPTURE_HEIGHT },
    },
    audio: false,
  });
}

export function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => t.stop());
}

export interface CapturedFrame {
  raw: string;      // unfiltered, for re-grading later
  filtered: string; // with CSS filter baked in, for fast composite
}

export interface CaptureFrameOptions {
  width?: number;
  height?: number;
  cssFilter?: string;
  mirrored?: boolean;
}

const PHOTO_MIME = "image/jpeg";
const PHOTO_QUALITY = 0.9;

// Capture a single frame from a video element.
// Plain camera frames are JPEG to keep mobile uploads reasonable; transparent
// cutouts and final strips are still generated as PNG in their own modules.
export function captureFrame(
  video: HTMLVideoElement,
  options: CaptureFrameOptions = {},
): CapturedFrame {
  const {
    width = CAPTURE_WIDTH,
    height = CAPTURE_HEIGHT,
    cssFilter,
    mirrored = true,
  } = options;

  // compute crop region to match target 3:4 aspect ratio
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    throw new Error("camera frame is not ready");
  }

  const targetRatio = width / height;
  const videoRatio = vw / vh;

  let sx = 0, sy = 0, sw = vw, sh = vh;

  if (videoRatio > targetRatio) {
    // video is wider — crop sides
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    // video is taller — crop top/bottom
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }

  // ---- raw capture (no filter) ----
  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = width;
  rawCanvas.height = height;
  const rawCtx = rawCanvas.getContext("2d")!;

  if (mirrored) {
    rawCtx.translate(width, 0);
    rawCtx.scale(-1, 1);
  }
  rawCtx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

  // ---- filtered capture (CSS filter baked in) ----
  const filteredCanvas = document.createElement("canvas");
  filteredCanvas.width = width;
  filteredCanvas.height = height;
  const filteredCtx = filteredCanvas.getContext("2d")!;

  if (cssFilter && cssFilter !== "none") {
    filteredCtx.filter = cssFilter;
  }

  if (mirrored) {
    filteredCtx.translate(width, 0);
    filteredCtx.scale(-1, 1);
  }
  filteredCtx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

  return {
    raw: rawCanvas.toDataURL(PHOTO_MIME, PHOTO_QUALITY),
    filtered: filteredCanvas.toDataURL(PHOTO_MIME, PHOTO_QUALITY),
  };
}
