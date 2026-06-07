// post-processing effects for the final strip.

export function applyGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity = 0.06,
) {
  applyGrainToRect(ctx, 0, 0, w, h, intensity);
}

export function applyGrainToRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity = 0.06,
) {
  const imageData = ctx.getImageData(x, y, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * intensity;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, x, y);
}

export function applyPaperTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity = 0.018,
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const fiber = Math.sin(x * 0.18) * 0.35 + Math.sin((x + y) * 0.045) * 0.65;
      const noise = (Math.random() - 0.5 + fiber * 0.16) * 255 * intensity;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity = 0.3,
) {
  applyVignetteToRect(ctx, 0, 0, w, h, intensity);
}

export function applyVignetteToRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity = 0.3,
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.max(w / 2, h / 2) * 1.2;

  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
  gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}

export function applyStudioFlashToRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const flash = ctx.createRadialGradient(
    x + w * 0.52,
    y + h * 0.18,
    0,
    x + w * 0.52,
    y + h * 0.18,
    h * 0.78,
  );
  flash.addColorStop(0, "rgba(255,255,255,0.20)");
  flash.addColorStop(0.46, "rgba(255,255,255,0.055)");
  flash.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = flash;
  ctx.fillRect(x, y, w, h);

  const polish = ctx.createLinearGradient(x, y, x, y + h);
  polish.addColorStop(0, "rgba(255,255,255,0.07)");
  polish.addColorStop(0.58, "rgba(255,255,255,0)");
  polish.addColorStop(1, "rgba(42,33,24,0.045)");
  ctx.fillStyle = polish;
  ctx.fillRect(x, y, w, h);
}
