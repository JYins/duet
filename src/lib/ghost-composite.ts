import { applyPaperTexture } from "./effects";
import { type LutPreset } from "./lut";
import { BACKGROUNDS } from "./backgrounds";
import {
  drawCover,
  drawFrameFinish,
  drawPaperBase,
  drawPhotoMount,
  finishPhotoPrint,
  drawStripStamp,
  getPhotoImageRect,
  getLayout,
  loadImage,
  PHOTO_CORNER_R,
  PAPER_CORNER_R,
  roundRect,
  STRIP_GAP,
  STRIP_PAD,
  type FrameLayout,
} from "./composite";

export interface GhostCompositeOptions {
  person1Cutouts: string[];
  person2Cutouts: string[];
  backgroundId: string;
  layout?: FrameLayout;
  lut?: LutPreset;
  grain?: boolean;
  vignette?: boolean;
  label?: string;
  date?: string;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, color);
  bg.addColorStop(0.58, softenColor(color, 16));
  bg.addColorStop(1, darkenColor(color, 10));
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  const light = ctx.createRadialGradient(x + w * 0.52, y + h * 0.22, 0, x + w * 0.52, y + h * 0.22, h * 0.9);
  light.addColorStop(0, "rgba(255,255,255,0.30)");
  light.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, h);
}

function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const shadow = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) / 2);
  shadow.addColorStop(0, "rgba(30,26,22,0.18)");
  shadow.addColorStop(1, "rgba(30,26,22,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function getCoverGeometry(
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

  return { sx, sy, sw, sh, dx: x, dy: y, dw: w, dh: h };
}

function getAlphaBounds(img: HTMLImageElement): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const sample = document.createElement("canvas");
  sample.width = 96;
  sample.height = 128;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) return null;

  sampleCtx.drawImage(img, 0, 0, sample.width, sample.height);
  const data = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
  let minX = sample.width;
  let minY = sample.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sample.height; y++) {
    for (let x = 0; x < sample.width; x++) {
      const alpha = data[(y * sample.width + x) * 4 + 3];
      if (alpha < 32) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    minX: minX / sample.width,
    minY: minY / sample.height,
    maxX: (maxX + 1) / sample.width,
    maxY: (maxY + 1) / sample.height,
  };
}

function imageHasTransparency(img: HTMLImageElement): boolean {
  const sample = document.createElement("canvas");
  sample.width = 48;
  sample.height = 48;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) return false;

  sampleCtx.drawImage(img, 0, 0, sample.width, sample.height);
  const data = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 245) return true;
  }
  return false;
}

function drawAlignedCutout(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
) {
  const geometry = getCoverGeometry(img, frameX, frameY, frameW, frameH);
  const bounds = getAlphaBounds(img);

  if (bounds) {
    const visibleW = (bounds.maxX - bounds.minX) * frameW;
    const centerX = frameX + ((bounds.minX + bounds.maxX) / 2) * frameW;
    const footY = frameY + bounds.maxY * frameH;
    drawContactShadow(
      ctx,
      centerX,
      Math.min(frameY + frameH * 0.965, footY + frameH * 0.018),
      Math.max(frameW * 0.20, Math.min(frameW * 0.48, visibleW * 0.84)),
      frameH * 0.075,
    );
  }

  ctx.save();
  ctx.shadowColor = "rgba(28,24,20,0.13)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.drawImage(
    img,
    geometry.sx,
    geometry.sy,
    geometry.sw,
    geometry.sh,
    geometry.dx,
    geometry.dy,
    geometry.dw,
    geometry.dh,
  );
  ctx.restore();
}

function drawFallbackPortrait(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  side: "left" | "right",
) {
  const gutter = Math.max(6, frameW * 0.018);
  const w = (frameW - gutter) / 2;
  const x = side === "left" ? frameX : frameX + w + gutter;
  const y = frameY;

  ctx.save();
  roundRect(ctx, x, y, w, frameH, Math.max(4, PHOTO_CORNER_R - 2));
  ctx.clip();
  drawCover(ctx, img, x, y, w, frameH);

  const gradient = ctx.createLinearGradient(x, y, x, y + frameH);
  gradient.addColorStop(0, "rgba(255,255,255,0.10)");
  gradient.addColorStop(1, "rgba(35,28,20,0.10)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, frameH);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, w - 2, frameH - 2, Math.max(3, PHOTO_CORNER_R - 3));
  ctx.stroke();
  ctx.restore();
}

function drawGhostSubject(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  src: string,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  side: "left" | "right",
) {
  if (!src.includes("#fallback") && imageHasTransparency(img)) {
    drawAlignedCutout(ctx, img, frameX, frameY, frameW, frameH);
  } else {
    drawFallbackPortrait(ctx, img, frameX, frameY, frameW, frameH, side);
  }
}

export async function generateGhostStrip(opts: GhostCompositeOptions): Promise<string> {
  const {
    person1Cutouts,
    person2Cutouts,
    backgroundId,
    layout = "2x2",
    lut = "k-booth",
    grain = true,
    vignette = true,
    label,
    date,
  } = opts;

  const cfg = getLayout(layout);
  if (person1Cutouts.length < cfg.count || person2Cutouts.length < cfg.count) {
    throw new Error(`not enough ghost frames for ${layout}: expected ${cfg.count} from each participant`);
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

  const paperColor = "#FBF7EF";
  drawPaperBase(ctx, canvas.width, canvas.height, paperColor);

  const bg = BACKGROUNDS.find((item) => item.id === backgroundId) || BACKGROUNDS[0];
  let bgImg: HTMLImageElement | null = null;
  if (bg.url) {
    try {
      bgImg = await loadImage(bg.url);
    } catch {
      bgImg = null;
    }
  }

  for (let i = 0; i < cfg.count; i++) {
    const col = i % cfg.cols;
    const row = Math.floor(i / cfg.cols);
    const x = STRIP_PAD + col * (cfg.frameW + STRIP_GAP);
    const y = STRIP_PAD + row * (cfg.frameH + STRIP_GAP);
    const photo = getPhotoImageRect(x, y, cfg.frameW, cfg.frameH);

    drawPhotoMount(ctx, x, y, cfg.frameW, cfg.frameH);

    ctx.save();
    roundRect(ctx, photo.x, photo.y, photo.w, photo.h, Math.max(4, PHOTO_CORNER_R - 2));
    ctx.clip();

    if (bgImg) {
      drawCover(ctx, bgImg, photo.x, photo.y, photo.w, photo.h);
    } else {
      drawBackground(ctx, photo.x, photo.y, photo.w, photo.h, bg.color);
    }

    const p1 = await loadImage(person1Cutouts[i]);
    drawGhostSubject(ctx, p1, person1Cutouts[i], photo.x, photo.y, photo.w, photo.h, "left");

    const p2 = await loadImage(person2Cutouts[i]);
    drawGhostSubject(ctx, p2, person2Cutouts[i], photo.x, photo.y, photo.w, photo.h, "right");
    finishPhotoPrint(ctx, photo.x, photo.y, photo.w, photo.h, lut, grain, vignette);

    ctx.restore();
    drawFrameFinish(ctx, x, y, cfg.frameW, cfg.frameH);
  }

  drawStripStamp(ctx, canvas.width, stripH, stampH, paperColor, label, date);
  applyPaperTexture(ctx, canvas.width, canvas.height, 0.012);

  ctx.strokeStyle = "rgba(40,37,34,0.10)";
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, canvas.width - 1, totalH - 1, PAPER_CORNER_R);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function softenColor(hex: string, amount: number): string {
  return adjustHex(hex, amount);
}

function darkenColor(hex: string, amount: number): string {
  return adjustHex(hex, -amount);
}

function adjustHex(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const value = Number.parseInt(normalized, 16);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}
