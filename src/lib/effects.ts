// post-processing effects: film grain + vignette
// applied as a final pass on the composite strip

export function applyGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity = 0.06,
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * intensity;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity = 0.3,
) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.max(cx, cy) * 1.2;

  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
  gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}
