// composites raw photos into styled frame layouts
// with LUT color grading, grain, vignette, decorations, and labels
//
// approach: raw photos go directly into frames (no segmentation).
// LUT applied to each photo. this matches real korean photo booths.

import { applyLut, getLutByPreset, type LutPreset } from "./lut";
import { applyGrain, applyVignette } from "./effects";

// ---- layouts ----

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
    case "2x2": return { cols: 2, rows: 2, frameW: 380, frameH: 506, count: 4 };
    case "1x3": return { cols: 1, rows: 3, frameW: 540, frameH: 720, count: 3 };
    case "2x3": return { cols: 2, rows: 3, frameW: 340, frameH: 453, count: 6 };
    case "2x4": return { cols: 2, rows: 4, frameW: 380, frameH: 506, count: 8 };
    case "3x3": return { cols: 3, rows: 3, frameW: 260, frameH: 346, count: 9 };
    default:    return { cols: 1, rows: 4, frameW: 540, frameH: 405, count: 4 };
  }
}

const PAD = 28;
const GAP = 10;
const CORNER_R = 4;

// ---- helpers ----

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
  x: number, y: number, w: number, h: number, r: number,
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

// cover-fit image into a rectangle
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const imgRatio = img.width / img.height;
  const frameRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgRatio > frameRatio) {
    sw = img.height * frameRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / frameRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ---- main ----

export interface CompositeOptions {
  photos: string[];        // raw photo data urls
  stripColor?: string;     // paper/border color
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
    stripColor = "#FDFCF9",
    layout = "1x4",
    lut = "warm-film",
    grain = true,
    vignette = true,
    label,
    date,
  } = opts;

  const cfg = getLayout(layout);
  const count = Math.min(photos.length, cfg.count);

  const gridW = cfg.cols * cfg.frameW + (cfg.cols - 1) * GAP;
  const gridH = cfg.rows * cfg.frameH + (cfg.rows - 1) * GAP;
  const STRIP_W = PAD * 2 + gridW;
  const STRIP_H = PAD * 2 + gridH;
  const stampH = label ? 76 : 48;
  const totalH = STRIP_H + stampH;

  const canvas = document.createElement("canvas");
  canvas.width = STRIP_W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  // paper fill
  ctx.fillStyle = stripColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw each photo into its frame
  for (let i = 0; i < count; i++) {
    const col = i % cfg.cols;
    const row = Math.floor(i / cfg.cols);
    const x = PAD + col * (cfg.frameW + GAP);
    const y = PAD + row * (cfg.frameH + GAP);

    ctx.save();
    roundRect(ctx, x, y, cfg.frameW, cfg.frameH, CORNER_R);
    ctx.clip();

    // draw raw photo — cover fit
    try {
      const img = await loadImage(photos[i]);
      drawCover(ctx, img, x, y, cfg.frameW, cfg.frameH);
    } catch {
      // photo failed to load, leave as strip color
      ctx.fillStyle = "#EDE9DF";
      ctx.fillRect(x, y, cfg.frameW, cfg.frameH);
    }

    ctx.restore();

    // subtle frame border
    ctx.save();
    roundRect(ctx, x, y, cfg.frameW, cfg.frameH, CORNER_R);
    ctx.strokeStyle = "rgba(44, 44, 42, 0.06)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // ---- LUT color grading on photo area ----
  if (lut !== "none") {
    const lutData = getLutByPreset(lut);
    applyLut(ctx, STRIP_W, STRIP_H, lutData, 0.8);
  }

  // grain + vignette
  if (grain) applyGrain(ctx, STRIP_W, STRIP_H, 0.035);
  if (vignette) applyVignette(ctx, STRIP_W, STRIP_H, 0.15);

  // clean stamp area
  ctx.fillStyle = stripColor;
  ctx.fillRect(0, STRIP_H, canvas.width, stampH);

  // custom label
  if (label) {
    ctx.fillStyle = "#2C2C2A";
    ctx.font = "italic 16px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText(label, canvas.width / 2, STRIP_H + 28, STRIP_W - PAD * 2);
  }

  // date + brand
  ctx.fillStyle = "#B5B2AB";
  ctx.font = "italic 10px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  const stampY = label ? STRIP_H + 48 : STRIP_H + 26;
  ctx.fillText(`Duet  ·  ${date || formatDate()}`, canvas.width / 2, stampY);

  // outer border
  ctx.strokeStyle = "rgba(44, 44, 42, 0.04)";
  ctx.lineWidth = 0.5;
  roundRect(ctx, 1, 1, canvas.width - 2, totalH - 2, 8);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function formatDate(): string {
  const d = new Date();
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function downloadImage(dataUrl: string, filename = "duet-strip.png") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
