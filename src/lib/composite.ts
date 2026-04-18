// composites segmented portraits onto a shared background
// and generates a korean-style 1x4 photo strip with LUT + grain + vignette
//
// supports two modes:
// - solo: one person per frame (4 cutouts)
// - duet: two people per frame (4 host cutouts + 4 guest cutouts)

import { createLutRenderer, getLutByPreset, type LutPreset } from "./lut";
import { applyGrain, applyVignette } from "./effects";

const FRAME_W = 540;
const FRAME_H = 720;
const STRIP_ROWS = 4;
const PAD = 24;
const INNER_GAP = 12;
const CORNER_R = 6;

const STRIP_W = PAD * 2 + FRAME_W;
const STRIP_H =
  PAD * 2 + FRAME_H * STRIP_ROWS + INNER_GAP * (STRIP_ROWS - 1);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}

function roundRect(
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

// draw a cutout into a frame, positioned left/right/center
function drawCutout(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  position: "left" | "right" | "center",
) {
  // scale to fit frame height
  const scale = Math.min((fw * 0.65) / img.width, fh / img.height);
  const cw = img.width * scale;
  const ch = img.height * scale;

  let cx: number;
  if (position === "left") {
    cx = fx + fw * 0.25 - cw / 2;
  } else if (position === "right") {
    cx = fx + fw * 0.75 - cw / 2;
  } else {
    cx = fx + (fw - cw) / 2;
  }
  const cy = fy + (fh - ch);

  ctx.drawImage(img, cx, cy, cw, ch);
}

export interface CompositeOptions {
  cutouts: string[];
  partnerCutouts?: string[]; // host's cutouts when in duet mode
  background?: string;
  lut?: LutPreset;
  grain?: boolean;
  vignette?: boolean;
  date?: string;
  title?: string;
}

export async function generateStrip(opts: CompositeOptions): Promise<string> {
  const {
    cutouts,
    partnerCutouts,
    background,
    lut = "warm-film",
    grain = true,
    vignette = true,
    date,
    title,
  } = opts;

  const isDuet = partnerCutouts && partnerCutouts.length > 0;
  const totalH = STRIP_H + 60;

  const canvas = document.createElement("canvas");
  canvas.width = STRIP_W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  // paper white fill
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // load background
  let bgImg: HTMLImageElement | null = null;
  if (background) {
    try {
      bgImg = await loadImage(background);
    } catch {
      // solid fallback
    }
  }

  // draw each frame
  const frameCount = Math.min(cutouts.length, STRIP_ROWS);
  for (let i = 0; i < frameCount; i++) {
    const x = PAD;
    const y = PAD + i * (FRAME_H + INNER_GAP);

    ctx.save();
    roundRect(ctx, x, y, FRAME_W, FRAME_H, CORNER_R);
    ctx.clip();

    // background
    if (bgImg) {
      const scale = Math.max(FRAME_W / bgImg.width, FRAME_H / bgImg.height);
      const sw = bgImg.width * scale;
      const sh = bgImg.height * scale;
      ctx.drawImage(
        bgImg,
        x + (FRAME_W - sw) / 2,
        y + (FRAME_H - sh) / 2,
        sw,
        sh,
      );
    } else {
      ctx.fillStyle = "#EDE9DF";
      ctx.fillRect(x, y, FRAME_W, FRAME_H);
    }

    if (isDuet && partnerCutouts[i]) {
      // duet mode: two people per frame
      // partner (host) on the left, self (guest) on the right
      try {
        const partner = await loadImage(partnerCutouts[i]);
        drawCutout(ctx, partner, x, y, FRAME_W, FRAME_H, "left");
      } catch {
        // partner cutout failed to load, skip
      }
      const self = await loadImage(cutouts[i]);
      drawCutout(ctx, self, x, y, FRAME_W, FRAME_H, "right");
    } else {
      // solo mode: single person centered
      const cutout = await loadImage(cutouts[i]);
      const cutScale = Math.min(
        FRAME_W / cutout.width,
        FRAME_H / cutout.height,
      );
      const cw = cutout.width * cutScale;
      const ch = cutout.height * cutScale;
      ctx.drawImage(
        cutout,
        x + (FRAME_W - cw) / 2,
        y + (FRAME_H - ch) / 2,
        cw,
        ch,
      );
    }

    ctx.restore();

    // thin border
    ctx.save();
    roundRect(ctx, x, y, FRAME_W, FRAME_H, CORNER_R);
    ctx.strokeStyle = "rgba(44, 44, 42, 0.08)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // ---- apply LUT to the photo area ----
  if (lut !== "none") {
    try {
      const lutData = getLutByPreset(lut);
      const renderer = createLutRenderer(STRIP_W, STRIP_H);
      const graded = renderer.apply(canvas, lutData, 0.85);
      ctx.putImageData(graded, 0, 0);
      renderer.dispose();
    } catch (e) {
      console.warn("[duet] LUT failed, skipping", e);
    }
  }

  // ---- grain + vignette ----
  if (grain) {
    applyGrain(ctx, canvas.width, STRIP_H, 0.04);
  }
  if (vignette) {
    applyVignette(ctx, canvas.width, STRIP_H, 0.2);
  }

  // re-draw paper border clean
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, STRIP_H, canvas.width, totalH - STRIP_H);

  // date stamp
  const stampY = STRIP_H + 30;
  ctx.fillStyle = "#8A8780";
  ctx.font = "italic 13px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  const stampText = [title || "duet", date || formatDate()]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillText(stampText, canvas.width / 2, stampY);

  // outer border
  ctx.strokeStyle = "rgba(44, 44, 42, 0.06)";
  ctx.lineWidth = 0.5;
  roundRect(ctx, 1, 1, canvas.width - 2, totalH - 2, 8);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function formatDate(): string {
  const d = new Date();
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function downloadImage(dataUrl: string, filename = "duet-strip.png") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
