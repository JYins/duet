// composites segmented portraits onto a shared background
// and generates a korean-style photo strip with LUT + grain + vignette
//
// solo: one person per frame, duet: two people per frame

import { createLutRenderer, getLutByPreset, type LutPreset } from "./lut";
import { applyGrain, applyVignette } from "./effects";

const FRAME_W = 540;
const FRAME_H = 720;
const PAD = 24;
const INNER_GAP = 12;
const CORNER_R = 6;

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

export interface CompositeOptions {
  cutouts: string[];
  partnerCutouts?: string[];
  background?: string; // url or null for solid
  bgColor?: string; // solid color fallback
  frameCount?: number; // how many frames (default 4)
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
    bgColor = "#EDE9DF",
    frameCount = 4,
    lut = "warm-film",
    grain = true,
    vignette = true,
    date,
    title,
  } = opts;

  const rows = Math.min(cutouts.length, frameCount);
  const isDuet = partnerCutouts && partnerCutouts.length > 0;

  const STRIP_W = PAD * 2 + FRAME_W;
  const STRIP_H = PAD * 2 + FRAME_H * rows + INNER_GAP * (rows - 1);
  const totalH = STRIP_H + 60;

  const canvas = document.createElement("canvas");
  canvas.width = STRIP_W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  // paper white fill
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // load background image if provided
  let bgImg: HTMLImageElement | null = null;
  if (background) {
    try {
      bgImg = await loadImage(background);
    } catch {
      // solid fallback
    }
  }

  // draw each frame
  for (let i = 0; i < rows; i++) {
    const x = PAD;
    const y = PAD + i * (FRAME_H + INNER_GAP);

    ctx.save();
    roundRect(ctx, x, y, FRAME_W, FRAME_H, CORNER_R);
    ctx.clip();

    // background fill
    if (bgImg) {
      const scale = Math.max(FRAME_W / bgImg.width, FRAME_H / bgImg.height);
      const sw = bgImg.width * scale;
      const sh = bgImg.height * scale;
      ctx.drawImage(bgImg, x + (FRAME_W - sw) / 2, y + (FRAME_H - sh) / 2, sw, sh);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, FRAME_W, FRAME_H);
    }

    // draw cutouts
    if (isDuet && partnerCutouts[i]) {
      // duet: partner left, self right
      try {
        const partner = await loadImage(partnerCutouts[i]);
        drawPerson(ctx, partner, x, y, FRAME_W, FRAME_H, "left");
      } catch {
        // partner image failed, skip
      }
      try {
        const self = await loadImage(cutouts[i]);
        drawPerson(ctx, self, x, y, FRAME_W, FRAME_H, "right");
      } catch {
        // self image failed
      }
    } else {
      // solo: centered
      try {
        const person = await loadImage(cutouts[i]);
        drawPerson(ctx, person, x, y, FRAME_W, FRAME_H, "center");
      } catch {
        // image failed
      }
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

  // apply LUT
  if (lut !== "none") {
    try {
      const lutData = getLutByPreset(lut);
      const renderer = createLutRenderer(STRIP_W, STRIP_H);
      const graded = renderer.apply(canvas, lutData, 0.85);
      ctx.putImageData(graded, 0, 0);
      renderer.dispose();
    } catch (e) {
      console.error("[duet] LUT failed:", e);
    }
  }

  // grain + vignette on photo area
  if (grain) applyGrain(ctx, canvas.width, STRIP_H, 0.04);
  if (vignette) applyVignette(ctx, canvas.width, STRIP_H, 0.2);

  // clean the stamp area
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, STRIP_H, canvas.width, totalH - STRIP_H);

  // date stamp
  ctx.fillStyle = "#8A8780";
  ctx.font = "italic 13px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  const stampText = [title || "Duet", date || formatDate()].filter(Boolean).join("  ·  ");
  ctx.fillText(stampText, canvas.width / 2, STRIP_H + 30);

  // outer border
  ctx.strokeStyle = "rgba(44, 44, 42, 0.06)";
  ctx.lineWidth = 0.5;
  roundRect(ctx, 1, 1, canvas.width - 2, totalH - 2, 8);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

// draw a person cutout into a frame at left/right/center position
function drawPerson(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  position: "left" | "right" | "center",
) {
  // scale to fill frame height, maintain aspect ratio
  const scale = fh / img.height;
  const cw = img.width * scale;
  const ch = img.height * scale;

  let cx: number;
  if (position === "center") {
    cx = fx + (fw - cw) / 2;
  } else if (position === "left") {
    // shift left person slightly left of center
    cx = fx + fw * 0.5 - cw * 0.75;
  } else {
    // shift right person slightly right of center
    cx = fx + fw * 0.5 - cw * 0.25;
  }

  ctx.drawImage(img, cx, fy + (fh - ch), cw, ch);
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
