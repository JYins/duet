export interface LutData {
  size: number;
  table: Float32Array;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function contrast(v: number, factor: number): number {
  return 0.5 + (v - 0.5) * factor;
}

function lift(v: number, amount: number): number {
  return amount + v * (1 - amount);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function makeLut(
  transform: (r: number, g: number, b: number) => [number, number, number],
  size = 16,
): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const [nr, ng, nb] = transform(r / (size - 1), g / (size - 1), b / (size - 1));
        table[idx++] = clamp01(nr);
        table[idx++] = clamp01(ng);
        table[idx++] = clamp01(nb);
      }
    }
  }

  return { size, table };
}

export function parseCube(text: string): LutData {
  const lines = text.split("\n");
  let size = 0;
  const values: number[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("TITLE")) continue;
    if (line.startsWith("LUT_3D_SIZE")) {
      size = Number.parseInt(line.split(/\s+/)[1], 10);
      continue;
    }
    if (line.startsWith("DOMAIN_MIN") || line.startsWith("DOMAIN_MAX")) continue;

    const parts = line.split(/\s+/).map(Number);
    if (parts.length >= 3 && !Number.isNaN(parts[0])) {
      values.push(parts[0], parts[1], parts[2]);
    }
  }

  if (size === 0) throw new Error("invalid .cube file");
  return { size, table: new Float32Array(values) };
}

function trilinearSample(lut: LutData, r: number, g: number, b: number): [number, number, number] {
  const s = lut.size - 1;
  const ri = r * s;
  const gi = g * s;
  const bi = b * s;
  const r0 = Math.floor(ri);
  const g0 = Math.floor(gi);
  const b0 = Math.floor(bi);
  const r1 = Math.min(r0 + 1, s);
  const g1 = Math.min(g0 + 1, s);
  const b1 = Math.min(b0 + 1, s);
  const rf = ri - r0;
  const gf = gi - g0;
  const bf = bi - b0;

  const idx = (rr: number, gg: number, bb: number) =>
    (bb * lut.size * lut.size + gg * lut.size + rr) * 3;

  const t = lut.table;
  const result: [number, number, number] = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) {
    const c00 = mix(t[idx(r0, g0, b0) + ch], t[idx(r1, g0, b0) + ch], rf);
    const c10 = mix(t[idx(r0, g1, b0) + ch], t[idx(r1, g1, b0) + ch], rf);
    const c01 = mix(t[idx(r0, g0, b1) + ch], t[idx(r1, g0, b1) + ch], rf);
    const c11 = mix(t[idx(r0, g1, b1) + ch], t[idx(r1, g1, b1) + ch], rf);
    result[ch] = mix(mix(c00, c10, gf), mix(c01, c11, gf), bf);
  }
  return result;
}

export function applyLut(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lut: LutData,
  intensity = 0.85,
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const [lr, lg, lb] = trilinearSample(lut, r, g, b);

    data[i] = Math.round(mix(r, lr, intensity) * 255);
    data[i + 1] = Math.round(mix(g, lg, intensity) * 255);
    data[i + 2] = Math.round(mix(b, lb, intensity) * 255);
  }

  ctx.putImageData(imageData, 0, 0);
}

export function generateIdentityLut(size = 16): LutData {
  return makeLut((r, g, b) => [r, g, b], size);
}

export function generateWarmFilmLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    const sat = 0.90;
    const nr = contrast(lift(l + (r - l) * sat, 0.045), 0.94) + 0.035;
    const ng = contrast(lift(l + (g - l) * sat, 0.045), 0.94) + 0.014;
    const nb = contrast(lift(l + (b - l) * sat, 0.045), 0.94) - 0.030;
    return [nr, ng, nb];
  }, size);
}

export function generateCoolDesatLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    return [
      contrast(l + (r - l) * 0.64, 0.95) - 0.004,
      contrast(l + (g - l) * 0.68, 0.95) + 0.008,
      contrast(l + (b - l) * 0.74, 0.95) + 0.036,
    ];
  }, size);
}

export function generateBWLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = contrast(lum(r, g, b), 1.16);
    return [l + 0.006, l + 0.002, l - 0.010];
  }, size);
}

export function generateFuji400hLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    const sat = 0.78;
    const shadow = 1 - Math.max(r, g, b);
    return [
      contrast(lift(l + (r - l) * sat, 0.070), 0.88) + 0.018,
      contrast(lift(l + (g - l) * sat, 0.070), 0.88) + 0.026 + shadow * 0.018,
      contrast(lift(l + (b - l) * sat, 0.070), 0.88) + 0.002,
    ];
  }, size);
}

export function generatePolaroidLut(size = 16): LutData {
  return makeLut((r, g, b) => [
    contrast(lift(r, 0.025), 1.06) + 0.018,
    contrast(lift(g, 0.025), 1.04) + 0.012,
    contrast(lift(b, 0.025), 1.02) + 0.016,
  ], size);
}

export function generateSepiaLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    return [l * 1.02 + 0.090, l * 0.94 + 0.052, l * 0.76 + 0.022];
  }, size);
}

export function generateCinematicLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    const nr = contrast(l + (r - l) * 0.68, 1.08);
    const ng = contrast(l + (g - l) * 0.68, 1.08);
    const nb = contrast(l + (b - l) * 0.68, 1.08);
    const shadow = 1 - Math.max(nr, ng, nb);
    return [nr + 0.018 - shadow * 0.018, ng + 0.004, nb + shadow * 0.024 - 0.010];
  }, size);
}

export function generateFadedLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    return [
      contrast(lift(l + (r - l) * 0.58, 0.105), 0.80) + 0.018,
      contrast(lift(l + (g - l) * 0.58, 0.105), 0.80) + 0.010,
      contrast(lift(l + (b - l) * 0.58, 0.105), 0.80) - 0.004,
    ];
  }, size);
}

export function generateGoldenLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    const glow = Math.max(r, g, b) * 0.038;
    return [
      contrast(lift(l + (r - l) * 0.88, 0.045), 0.94) + 0.055 + glow,
      contrast(lift(l + (g - l) * 0.84, 0.045), 0.94) + 0.026 + glow * 0.45,
      contrast(lift(l + (b - l) * 0.76, 0.045), 0.94) - 0.060,
    ];
  }, size);
}

export function generateLomoLut(size = 16): LutData {
  return makeLut((r, g, b) => {
    const l = lum(r, g, b);
    return [
      contrast(l + (r - l) * 1.06, 1.06) + 0.018,
      contrast(l + (g - l) * 0.98, 1.04) - 0.006,
      contrast(l + (b - l) * 1.04, 1.06) + 0.018,
    ];
  }, size);
}

export function generateInstantLut(size = 16): LutData {
  return makeLut((r, g, b) => [
    contrast(lift(r, 0.055), 0.88) + 0.034,
    contrast(lift(g, 0.055), 0.88) + 0.020,
    contrast(lift(b, 0.055), 0.88) + 0.010,
  ], size);
}

export type LutPreset =
  | "none"
  | "warm-film"
  | "cool-desat"
  | "bw"
  | "fuji-400h"
  | "polaroid"
  | "sepia"
  | "cinematic"
  | "faded"
  | "golden"
  | "lomo"
  | "instant";

export function getLutByPreset(preset: LutPreset): LutData {
  switch (preset) {
    case "warm-film": return generateWarmFilmLut();
    case "cool-desat": return generateCoolDesatLut();
    case "bw": return generateBWLut();
    case "fuji-400h": return generateFuji400hLut();
    case "polaroid": return generatePolaroidLut();
    case "sepia": return generateSepiaLut();
    case "cinematic": return generateCinematicLut();
    case "faded": return generateFadedLut();
    case "golden": return generateGoldenLut();
    case "lomo": return generateLomoLut();
    case "instant": return generateInstantLut();
    default: return generateIdentityLut();
  }
}

export const LUT_PRESETS: { id: LutPreset; label: string }[] = [
  { id: "warm-film", label: "soft" },
  { id: "fuji-400h", label: "milk" },
  { id: "instant", label: "studio" },
  { id: "faded", label: "veil" },
  { id: "polaroid", label: "flash" },
  { id: "golden", label: "honey" },
  { id: "cool-desat", label: "cool" },
  { id: "cinematic", label: "night" },
  { id: "bw", label: "mono" },
  { id: "sepia", label: "sepia" },
  { id: "lomo", label: "pop" },
  { id: "none", label: "raw" },
];

export const LUT_CSS_FILTERS: Record<LutPreset, string> = {
  none: "none",
  "warm-film": "sepia(0.08) saturate(0.94) brightness(1.055) contrast(0.94)",
  "cool-desat": "saturate(0.68) brightness(1.04) contrast(0.95) hue-rotate(8deg)",
  bw: "grayscale(1) contrast(1.14) brightness(1.04)",
  "fuji-400h": "saturate(0.76) contrast(0.88) brightness(1.08) hue-rotate(-3deg)",
  polaroid: "contrast(1.04) brightness(1.06) saturate(0.92) sepia(0.03)",
  sepia: "sepia(0.48) contrast(1.02) brightness(1.00) saturate(0.82)",
  cinematic: "saturate(0.70) contrast(1.08) brightness(0.98)",
  faded: "contrast(0.80) brightness(1.08) saturate(0.60)",
  golden: "sepia(0.17) saturate(0.94) brightness(1.04) contrast(0.94)",
  lomo: "saturate(1.08) contrast(1.06) brightness(0.99) hue-rotate(8deg)",
  instant: "brightness(1.08) contrast(0.88) saturate(0.80) sepia(0.04)",
};
