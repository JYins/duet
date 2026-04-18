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

// capture a single frame from a video element as a blob url
export function captureFrame(
  video: HTMLVideoElement,
  width = 1080,
  height = 1440,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;

  // crop center of video to target aspect ratio
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetRatio = width / height;
  const videoRatio = vw / vh;

  let sx = 0,
    sy = 0,
    sw = vw,
    sh = vh;

  if (videoRatio > targetRatio) {
    // video is wider — crop sides
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    // video is taller — crop top/bottom
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }

  // mirror for front camera
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

  return canvas.toDataURL("image/png");
}
