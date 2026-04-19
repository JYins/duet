// ghost mode composite: segmented cutouts from two people placed on shared virtual background
// with unified LUT, grain, and vignette

import { loadImage, roundRect, getLayout, type FrameLayout } from "./composite";
import { applyLut, getLutByPreset, type LutPreset } from "./lut";
import { applyGrain, applyVignette } from "./effects";
import { BACKGROUNDS } from "./backgrounds";

const PAD = 28;
const GAP = 10;
const CORNER_R = 4;

export interface GhostCompositeOptions {
  person1Cutouts: string[];
  person2Cutouts: string[];
  backgroundId: string;
  layout?: FrameLayout;
  lut?: LutPreset;
  grain?: boolean;
  vignette?: boolean;
  label?: string;
}

export async function generateGhostStrip(opts: GhostCompositeOptions): Promise<string> {
  const {
    person1Cutouts,
    person2Cutouts,
    backgroundId,
    layout = "2x2",
    lut = "warm-film",
    grain = true,
    vignette = true,
    label,
  } = opts;

  const cfg = getLayout(layout);
  // ghost mode: each frame has both people. frame count = min of both arrays
  const frameCount = Math.min(person1Cutouts.length, person2Cutouts.length, cfg.count);

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

  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // load background
  const bg = BACKGROUNDS.find((b) => b.id === backgroundId) || BACKGROUNDS[0];
  let bgImg: HTMLImageElement | null = null;
  if (bg.url) {
    try { bgImg = await loadImage(bg.url); } catch {}
  }

  for (let i = 0; i < frameCount; i++) {
    const col = i % cfg.cols;
    const row = Math.floor(i / cfg.cols);
    const x = PAD + col * (cfg.frameW + GAP);
    const y = PAD + row * (cfg.frameH + GAP);

    ctx.save();
    roundRect(ctx, x, y, cfg.frameW, cfg.frameH, CORNER_R);
    ctx.clip();

    // draw background
    if (bgImg) {
      const s = Math.max(cfg.frameW / bgImg.width, cfg.frameH / bgImg.height);
      ctx.drawImage(bgImg,
        x + (cfg.frameW - bgImg.width * s) / 2,
        y + (cfg.frameH - bgImg.height * s) / 2,
        bgImg.width * s, bgImg.height * s);
    } else {
      ctx.fillStyle = bg.color;
      ctx.fillRect(x, y, cfg.frameW, cfg.frameH);
    }

    // draw person 1 (left-ish)
    try {
      const p1 = await loadImage(person1Cutouts[i]);
      const scale = cfg.frameH / p1.height;
      const pw = p1.width * scale;
      ctx.drawImage(p1, x + cfg.frameW * 0.5 - pw * 0.75, y, pw, cfg.frameH);
    } catch {}

    // draw person 2 (right-ish)
    try {
      const p2 = await loadImage(person2Cutouts[i]);
      const scale = cfg.frameH / p2.height;
      const pw = p2.width * scale;
      ctx.drawImage(p2, x + cfg.frameW * 0.5 - pw * 0.25, y, pw, cfg.frameH);
    } catch {}

    ctx.restore();

    // border
    ctx.save();
    roundRect(ctx, x, y, cfg.frameW, cfg.frameH, CORNER_R);
    ctx.strokeStyle = "rgba(44, 44, 42, 0.06)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // unified LUT on everything
  if (lut !== "none") {
    applyLut(ctx, STRIP_W, STRIP_H, getLutByPreset(lut), 0.8);
  }

  if (grain) applyGrain(ctx, STRIP_W, STRIP_H, 0.045);
  if (vignette) applyVignette(ctx, STRIP_W, STRIP_H, 0.15);

  // stamp area
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, STRIP_H, canvas.width, stampH);

  if (label) {
    ctx.fillStyle = "#2C2C2A";
    ctx.font = "italic 16px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText(label, canvas.width / 2, STRIP_H + 28, STRIP_W - PAD * 2);
  }

  ctx.fillStyle = "#B5B2AB";
  ctx.font = "italic 10px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  const d = new Date();
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const dateStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  ctx.fillText(`Duet  ·  ${dateStr}`, canvas.width / 2, label ? STRIP_H + 48 : STRIP_H + 26);

  ctx.strokeStyle = "rgba(44, 44, 42, 0.04)";
  ctx.lineWidth = 0.5;
  roundRect(ctx, 1, 1, canvas.width - 2, totalH - 2, 8);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
