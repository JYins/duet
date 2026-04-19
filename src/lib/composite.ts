// composites segmented portraits onto backgrounds in various layouts
// with LUT color grading, grain, vignette, and custom text labels

import { applyLut, getLutByPreset, type LutPreset } from "./lut";
import { applyGrain, applyVignette } from "./effects";

// ---- layouts ----

export type FrameLayout = "1x4" | "2x2" | "1x3" | "2x3";

interface LayoutConfig {
  cols: number;
  rows: number;
  frameW: number;
  frameH: number;
  count: number;
}

function getLayout(layout: FrameLayout): LayoutConfig {
  switch (layout) {
    case "2x2": return { cols: 2, rows: 2, frameW: 360, frameH: 480, count: 4 };
    case "1x3": return { cols: 1, rows: 3, frameW: 540, frameH: 720, count: 3 };
    case "2x3": return { cols: 2, rows: 3, frameW: 320, frameH: 426, count: 6 };
    default:    return { cols: 1, rows: 4, frameW: 540, frameH: 720, count: 4 };
  }
}

const PAD = 24;
const GAP = 10;
const CORNER_R = 6;

// ---- helpers ----

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function drawPerson(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  fx: number, fy: number, fw: number, fh: number,
  position: "left" | "right" | "center",
) {
  const scale = fh / img.height;
  const cw = img.width * scale;
  const ch = fh;
  let cx: number;
  if (position === "center") cx = fx + (fw - cw) / 2;
  else if (position === "left") cx = fx + fw * 0.5 - cw * 0.75;
  else cx = fx + fw * 0.5 - cw * 0.25;
  ctx.drawImage(img, cx, fy + (fh - ch), cw, ch);
}

// ---- main ----

export interface CompositeOptions {
  cutouts: string[];
  partnerCutouts?: string[];
  background?: string;
  bgColor?: string;
  layout?: FrameLayout;
  lut?: LutPreset;
  grain?: boolean;
  vignette?: boolean;
  label?: string; // custom text label on the strip
  date?: string;
}

export async function generateStrip(opts: CompositeOptions): Promise<string> {
  const {
    cutouts,
    partnerCutouts,
    background,
    bgColor = "#EDE9DF",
    layout = "1x4",
    lut = "warm-film",
    grain = true,
    vignette = true,
    label,
    date,
  } = opts;

  const cfg = getLayout(layout);
  const isDuet = partnerCutouts && partnerCutouts.length > 0;
  const frameCount = Math.min(cutouts.length, cfg.count);

  const gridW = cfg.cols * cfg.frameW + (cfg.cols - 1) * GAP;
  const gridH = cfg.rows * cfg.frameH + (cfg.rows - 1) * GAP;
  const STRIP_W = PAD * 2 + gridW;
  const STRIP_H = PAD * 2 + gridH;
  const stampH = label ? 80 : 50;
  const totalH = STRIP_H + stampH;

  const canvas = document.createElement("canvas");
  canvas.width = STRIP_W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  // paper fill
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // load background image
  let bgImg: HTMLImageElement | null = null;
  if (background) {
    try { bgImg = await loadImage(background); } catch { /* solid fallback */ }
  }

  // draw frames
  for (let i = 0; i < frameCount; i++) {
    const col = i % cfg.cols;
    const row = Math.floor(i / cfg.cols);
    const x = PAD + col * (cfg.frameW + GAP);
    const y = PAD + row * (cfg.frameH + GAP);

    ctx.save();
    roundRect(ctx, x, y, cfg.frameW, cfg.frameH, CORNER_R);
    ctx.clip();

    // background
    if (bgImg) {
      const s = Math.max(cfg.frameW / bgImg.width, cfg.frameH / bgImg.height);
      ctx.drawImage(bgImg, x + (cfg.frameW - bgImg.width * s) / 2, y + (cfg.frameH - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, cfg.frameW, cfg.frameH);
    }

    // person(s)
    if (isDuet && partnerCutouts[i]) {
      try { const p = await loadImage(partnerCutouts[i]); drawPerson(ctx, p, x, y, cfg.frameW, cfg.frameH, "left"); } catch {}
      try { const s = await loadImage(cutouts[i]); drawPerson(ctx, s, x, y, cfg.frameW, cfg.frameH, "right"); } catch {}
    } else if (cutouts[i]) {
      try { const p = await loadImage(cutouts[i]); drawPerson(ctx, p, x, y, cfg.frameW, cfg.frameH, "center"); } catch {}
    }

    ctx.restore();

    // frame border
    ctx.save();
    roundRect(ctx, x, y, cfg.frameW, cfg.frameH, CORNER_R);
    ctx.strokeStyle = "rgba(44, 44, 42, 0.08)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // ---- LUT (pure Canvas 2D — works everywhere) ----
  if (lut !== "none") {
    const lutData = getLutByPreset(lut);
    applyLut(ctx, STRIP_W, STRIP_H, lutData, 0.85);
  }

  // grain + vignette
  if (grain) applyGrain(ctx, STRIP_W, STRIP_H, 0.04);
  if (vignette) applyVignette(ctx, STRIP_W, STRIP_H, 0.2);

  // clean stamp area
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, STRIP_H, canvas.width, stampH);

  // custom label (large, serif)
  if (label) {
    ctx.fillStyle = "#2C2C2A";
    ctx.font = "italic 18px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText(label, canvas.width / 2, STRIP_H + 30, STRIP_W - PAD * 2);
  }

  // date + brand stamp
  ctx.fillStyle = "#8A8780";
  ctx.font = "italic 11px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  const stampY = label ? STRIP_H + 52 : STRIP_H + 28;
  ctx.fillText(`Duet  ·  ${date || formatDate()}`, canvas.width / 2, stampY);

  // outer border
  ctx.strokeStyle = "rgba(44, 44, 42, 0.06)";
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
