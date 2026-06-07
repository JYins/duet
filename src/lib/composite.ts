import { applyGrain, applyPaperTexture, applyVignette } from "./effects";
import { applyLut, getLutByPreset, type LutPreset } from "./lut";

export type FrameLayout = "1x4" | "2x2" | "1x3" | "2x3" | "2x4" | "3x3";

interface LayoutConfig {
  cols: number;
  rows: number;
  frameW: number;
  frameH: number;
  count: number;
}

export function getLayout(layout: FrameLayout): LayoutConfig {
  switch (layout) {
    case "2x2": return { cols: 2, rows: 2, frameW: 360, frameH: 480, count: 4 };
    case "1x3": return { cols: 1, rows: 3, frameW: 540, frameH: 720, count: 3 };
    case "2x3": return { cols: 2, rows: 3, frameW: 320, frameH: 426, count: 6 };
    case "2x4": return { cols: 2, rows: 4, frameW: 320, frameH: 426, count: 8 };
    case "3x3": return { cols: 3, rows: 3, frameW: 248, frameH: 330, count: 9 };
    default: return { cols: 1, rows: 4, frameW: 504, frameH: 672, count: 4 };
  }
}

export const STRIP_PAD = 30;
export const STRIP_GAP = 12;
export const PHOTO_MAT = 8;
export const PHOTO_CORNER_R = 7;
export const PHOTO_IMAGE_R = 5;
export const PAPER_CORNER_R = 12;

const INK = "#282522";
const MUTED_INK = "#A9A49A";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const frameRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > frameRatio) {
    sw = img.height * frameRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / frameRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function drawPaperBase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createLinearGradient(0, 0, w, h);
  glow.addColorStop(0, "rgba(255,255,255,0.72)");
  glow.addColorStop(0.48, "rgba(255,255,255,0)");
  glow.addColorStop(1, "rgba(114,96,74,0.055)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

export function drawFrameFinish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const sheen = ctx.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, "rgba(255,255,255,0.12)");
  sheen.addColorStop(0.58, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(34,28,22,0.075)");
  ctx.fillStyle = sheen;
  roundRect(ctx, x, y, w, h, PHOTO_CORNER_R);
  ctx.fill();

  ctx.strokeStyle = "rgba(38,35,31,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, PHOTO_CORNER_R);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = 3;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, PHOTO_CORNER_R - 2);
  ctx.stroke();
}

export function getPhotoImageRect(
  x: number,
  y: number,
  w: number,
  h: number,
) {
  return {
    x: x + PHOTO_MAT,
    y: y + PHOTO_MAT,
    w: w - PHOTO_MAT * 2,
    h: h - PHOTO_MAT * 2,
  };
}

export function drawPhotoMount(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const mat = ctx.createLinearGradient(x, y, x + w, y + h);
  mat.addColorStop(0, "#FFFEFA");
  mat.addColorStop(0.62, "#F8F2E8");
  mat.addColorStop(1, "#EFE6D8");
  ctx.fillStyle = mat;
  roundRect(ctx, x, y, w, h, PHOTO_CORNER_R);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, PHOTO_CORNER_R - 2);
  ctx.stroke();

  const inner = getPhotoImageRect(x, y, w, h);
  ctx.strokeStyle = "rgba(52,45,38,0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, inner.x - 0.5, inner.y - 0.5, inner.w + 1, inner.h + 1, PHOTO_IMAGE_R + 1);
  ctx.stroke();
}

export function drawStripStamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  stampH: number,
  paperColor: string,
  label?: string,
  date?: string,
) {
  ctx.fillStyle = paperColor;
  ctx.fillRect(0, y, w, stampH);

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = "600 16px Georgia, 'Times New Roman', serif";
  ctx.fillText(label?.trim() || "DUET STUDIO", w / 2, y + 25, w - STRIP_PAD * 2);

  ctx.fillStyle = MUTED_INK;
  ctx.font = "10px Inter, Arial, sans-serif";
  ctx.fillText(`${formatDate(date)} / TWO-PERSON PHOTOBOOTH`, w / 2, y + 45, w - STRIP_PAD * 2);

  ctx.fillStyle = "rgba(40,37,34,0.38)";
  ctx.font = "8px Inter, Arial, sans-serif";
  ctx.fillText("FRAMED IN DUET", w / 2, y + stampH - 14, w - STRIP_PAD * 2);
}

export interface CompositeOptions {
  photos: string[];
  stripColor?: string;
  layout?: FrameLayout;
  lut?: LutPreset;
  grain?: boolean;
  vignette?: boolean;
  label?: string;
  date?: string;
}

export async function generateStrip(opts: CompositeOptions): Promise<string> {
  const {
    photos,
    stripColor = "#FBF7EF",
    layout = "1x4",
    lut = "warm-film",
    grain = true,
    vignette = true,
    label,
    date,
  } = opts;

  const cfg = getLayout(layout);
  if (photos.length < cfg.count) {
    throw new Error(`not enough photos for ${layout}: expected ${cfg.count}, got ${photos.length}`);
  }

  const gridW = cfg.cols * cfg.frameW + (cfg.cols - 1) * STRIP_GAP;
  const gridH = cfg.rows * cfg.frameH + (cfg.rows - 1) * STRIP_GAP;
  const stripW = STRIP_PAD * 2 + gridW;
  const stripH = STRIP_PAD * 2 + gridH;
  const stampH = 72;
  const totalH = stripH + stampH;

  const canvas = document.createElement("canvas");
  canvas.width = stripW;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  drawPaperBase(ctx, canvas.width, canvas.height, stripColor);

  for (let i = 0; i < cfg.count; i++) {
    const col = i % cfg.cols;
    const row = Math.floor(i / cfg.cols);
    const x = STRIP_PAD + col * (cfg.frameW + STRIP_GAP);
    const y = STRIP_PAD + row * (cfg.frameH + STRIP_GAP);
    const photo = getPhotoImageRect(x, y, cfg.frameW, cfg.frameH);

    drawPhotoMount(ctx, x, y, cfg.frameW, cfg.frameH);

    ctx.save();
    roundRect(ctx, photo.x, photo.y, photo.w, photo.h, PHOTO_IMAGE_R);
    ctx.clip();

    const img = await loadImage(photos[i]);
    drawCover(ctx, img, photo.x, photo.y, photo.w, photo.h);

    ctx.restore();
    drawFrameFinish(ctx, x, y, cfg.frameW, cfg.frameH);
  }

  if (lut !== "none") {
    applyLut(ctx, stripW, stripH, getLutByPreset(lut), 0.82);
  }
  if (grain) applyGrain(ctx, stripW, stripH, 0.026);
  if (vignette) applyVignette(ctx, stripW, stripH, 0.10);

  drawStripStamp(ctx, canvas.width, stripH, stampH, stripColor, label, date);
  applyPaperTexture(ctx, canvas.width, canvas.height, 0.012);

  ctx.strokeStyle = "rgba(40,37,34,0.10)";
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, canvas.width - 1, totalH - 1, PAPER_CORNER_R);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function formatDate(input?: string): string {
  if (input) return input;
  const d = new Date();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export async function downloadImage(src: string, filename = "duet-strip.png") {
  let objectUrl: string | null = null;
  let href = src;

  try {
    const res = await fetch(src);
    const blob = await res.blob();
    objectUrl = URL.createObjectURL(blob);
    href = objectUrl;
  } catch {
    // Keep the original href as a last-resort fallback.
  }

  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  a.click();

  if (objectUrl) {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}
