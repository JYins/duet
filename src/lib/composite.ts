// composites segmented portraits onto a shared background
// and generates a korean-style 1x4 photo strip

const FRAME_W = 540;
const FRAME_H = 720;
const STRIP_COLS = 1;
const STRIP_ROWS = 4;
const PAD = 24;
const INNER_GAP = 12;
const CORNER_R = 6;

// total strip dimensions
const STRIP_W = PAD * 2 + FRAME_W;
const STRIP_H = PAD * 2 + FRAME_H * STRIP_ROWS + INNER_GAP * (STRIP_ROWS - 1);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load image`));
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
  background?: string; // url or data url — if omitted, uses cream solid
  date?: string;
  title?: string;
}

export async function generateStrip(opts: CompositeOptions): Promise<string> {
  const { cutouts, background, date, title } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = STRIP_W;
  canvas.height = STRIP_H + 60; // extra space for date stamp at bottom
  const ctx = canvas.getContext("2d")!;

  // fill with strip paper color
  ctx.fillStyle = "#FDFCF9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // load background if provided
  let bgImg: HTMLImageElement | null = null;
  if (background) {
    try {
      bgImg = await loadImage(background);
    } catch {
      // fallback to solid color
    }
  }

  // draw each frame
  for (let i = 0; i < Math.min(cutouts.length, STRIP_ROWS); i++) {
    const x = PAD;
    const y = PAD + i * (FRAME_H + INNER_GAP);

    ctx.save();
    roundRect(ctx, x, y, FRAME_W, FRAME_H, CORNER_R);
    ctx.clip();

    // background for this frame
    if (bgImg) {
      // cover-fit the background
      const scale = Math.max(FRAME_W / bgImg.width, FRAME_H / bgImg.height);
      const sw = bgImg.width * scale;
      const sh = bgImg.height * scale;
      ctx.drawImage(bgImg, x + (FRAME_W - sw) / 2, y + (FRAME_H - sh) / 2, sw, sh);
    } else {
      ctx.fillStyle = "#EDE9DF";
      ctx.fillRect(x, y, FRAME_W, FRAME_H);
    }

    // draw cutout portrait
    const cutout = await loadImage(cutouts[i]);
    // center-fit the cutout
    const cutScale = Math.min(FRAME_W / cutout.width, FRAME_H / cutout.height);
    const cw = cutout.width * cutScale;
    const ch = cutout.height * cutScale;
    ctx.drawImage(cutout, x + (FRAME_W - cw) / 2, y + (FRAME_H - ch) / 2, cw, ch);

    ctx.restore();

    // thin border around frame
    ctx.save();
    roundRect(ctx, x, y, FRAME_W, FRAME_H, CORNER_R);
    ctx.strokeStyle = "rgba(44, 44, 42, 0.08)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // date stamp at bottom
  const stampY = STRIP_H + 20;
  ctx.fillStyle = "#8A8780";
  ctx.font = "italic 13px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";

  const stampText = [title || "duet", date || formatDate()].filter(Boolean).join("  ·  ");
  ctx.fillText(stampText, canvas.width / 2, stampY);

  // subtle outer border
  ctx.strokeStyle = "rgba(44, 44, 42, 0.06)";
  ctx.lineWidth = 0.5;
  roundRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, 8);
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
