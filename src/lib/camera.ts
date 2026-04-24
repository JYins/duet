// camera access and capture utilities

export type FacingMode = "user" | "environment";

export async function getStream(facing: FacingMode = "user") {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: facing,
      width: { ideal: 1080 },
      height: { ideal: 1440 },
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

// capture a single frame from a video element
// returns both raw and CSS-filtered versions so we can:
//   - use filtered for instant composite (no LUT pass needed)
//   - keep raw for re-grading with a different LUT later
export function captureFrame(
  video: HTMLVideoElement,
  width = 1080,
  height = 1440,
  cssFilter?: string,
): CapturedFrame {
  // compute crop region to match target 3:4 aspect ratio
  const vw = video.videoWidth;
  const vh = video.videoHeight;
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

  // mirror for front camera
  rawCtx.translate(width, 0);
  rawCtx.scale(-1, 1);
  rawCtx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

  // ---- filtered capture (CSS filter baked in) ----
  const filteredCanvas = document.createElement("canvas");
  filteredCanvas.width = width;
  filteredCanvas.height = height;
  const filteredCtx = filteredCanvas.getContext("2d")!;

  if (cssFilter && cssFilter !== "none") {
    filteredCtx.filter = cssFilter;
  }

  // mirror for front camera
  filteredCtx.translate(width, 0);
  filteredCtx.scale(-1, 1);
  filteredCtx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

  return {
    raw: rawCanvas.toDataURL("image/png"),
    filtered: filteredCanvas.toDataURL("image/png"),
  };
}
