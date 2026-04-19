// LUT color grading — pure Canvas 2D implementation
// no WebGL dependency, works on all browsers including iOS Safari
//
// applies color transform to every pixel via lookup table

export interface LutData {
  size: number;
  table: Float32Array; // flattened RGB, size^3 * 3
}

// ---- .cube parser (for future custom LUT uploads) ----

export function parseCube(text: string): LutData {
  const lines = text.split("\n");
  let size = 0;
  const values: number[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("TITLE")) continue;
    if (line.startsWith("LUT_3D_SIZE")) {
      size = parseInt(line.split(/\s+/)[1], 10);
      continue;
    }
    if (line.startsWith("DOMAIN_MIN") || line.startsWith("DOMAIN_MAX")) continue;

    const parts = line.split(/\s+/).map(Number);
    if (parts.length >= 3 && !isNaN(parts[0])) {
      values.push(parts[0], parts[1], parts[2]);
    }
  }

  if (size === 0) throw new Error("invalid .cube file");
  return { size, table: new Float32Array(values) };
}

// ---- Canvas 2D LUT application ----

function trilinearSample(lut: LutData, r: number, g: number, b: number): [number, number, number] {
  const s = lut.size - 1;
  const ri = r * s, gi = g * s, bi = b * s;
  const r0 = Math.floor(ri), g0 = Math.floor(gi), b0 = Math.floor(bi);
  const r1 = Math.min(r0 + 1, s), g1 = Math.min(g0 + 1, s), b1 = Math.min(b0 + 1, s);
  const rf = ri - r0, gf = gi - g0, bf = bi - b0;

  const idx = (ri: number, gi: number, bi: number) =>
    (bi * lut.size * lut.size + gi * lut.size + ri) * 3;

  // 8 corners
  const c000 = idx(r0, g0, b0);
  const c100 = idx(r1, g0, b0);
  const c010 = idx(r0, g1, b0);
  const c110 = idx(r1, g1, b0);
  const c001 = idx(r0, g0, b1);
  const c101 = idx(r1, g0, b1);
  const c011 = idx(r0, g1, b1);
  const c111 = idx(r1, g1, b1);

  const t = lut.table;
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  const result: [number, number, number] = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) {
    const c00 = lerp(t[c000 + ch], t[c100 + ch], rf);
    const c10 = lerp(t[c010 + ch], t[c110 + ch], rf);
    const c01 = lerp(t[c001 + ch], t[c101 + ch], rf);
    const c11 = lerp(t[c011 + ch], t[c111 + ch], rf);
    const c0 = lerp(c00, c10, gf);
    const c1 = lerp(c01, c11, gf);
    result[ch] = lerp(c0, c1, bf);
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

    data[i] = Math.round((r * (1 - intensity) + lr * intensity) * 255);
    data[i + 1] = Math.round((g * (1 - intensity) + lg * intensity) * 255);
    data[i + 2] = Math.round((b * (1 - intensity) + lb * intensity) * 255);
  }

  ctx.putImageData(imageData, 0, 0);
}

// ---- built-in LUT presets ----

export function generateIdentityLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        table[idx++] = r / (size - 1);
        table[idx++] = g / (size - 1);
        table[idx++] = b / (size - 1);
      }
    }
  }
  return { size, table };
}

// warm film — Kodak Portra style
export function generateWarmFilmLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const lift = 0.03;
        table[idx++] = Math.min(1, lift + rf * (1 - lift) * 1.02);
        table[idx++] = Math.min(1, lift + gf * (1 - lift) * 0.98);
        table[idx++] = Math.min(1, lift + bf * (1 - lift) * 0.90);
      }
    }
  }
  return { size, table };
}

// cool desaturated
export function generateCoolDesatLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const lum = 0.299 * rf + 0.587 * gf + 0.114 * bf;
        const d = 0.35;
        table[idx++] = Math.max(0, Math.min(1, rf * (1 - d) + lum * d - 0.01));
        table[idx++] = Math.max(0, Math.min(1, gf * (1 - d) + lum * d + 0.01));
        table[idx++] = Math.max(0, Math.min(1, bf * (1 - d) + lum * d + 0.04));
      }
    }
  }
  return { size, table };
}

// high contrast black & white
export function generateBWLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        let lum = 0.299 * (r / (size - 1)) + 0.587 * (g / (size - 1)) + 0.114 * (b / (size - 1));
        lum = lum < 0.5 ? 2 * lum * lum : 1 - 2 * (1 - lum) * (1 - lum);
        table[idx++] = Math.max(0, Math.min(1, lum + 0.01));
        table[idx++] = Math.max(0, Math.min(1, lum));
        table[idx++] = Math.max(0, Math.min(1, lum - 0.015));
      }
    }
  }
  return { size, table };
}

export type LutPreset = "none" | "warm-film" | "cool-desat" | "bw";

export function getLutByPreset(preset: LutPreset): LutData {
  switch (preset) {
    case "warm-film": return generateWarmFilmLut();
    case "cool-desat": return generateCoolDesatLut();
    case "bw": return generateBWLut();
    default: return generateIdentityLut();
  }
}

export const LUT_PRESETS: { id: LutPreset; label: string }[] = [
  { id: "none", label: "natural" },
  { id: "warm-film", label: "portra" },
  { id: "cool-desat", label: "cool" },
  { id: "bw", label: "mono" },
];

// CSS filter approximations for real-time viewfinder preview
// exact LUT is still applied pixel-by-pixel during composite
export const LUT_CSS_FILTERS: Record<LutPreset, string> = {
  "none": "none",
  "warm-film": "sepia(0.15) saturate(1.1) brightness(1.03) contrast(0.97)",
  "cool-desat": "saturate(0.65) brightness(1.02) hue-rotate(10deg)",
  "bw": "grayscale(1) contrast(1.3) brightness(1.05)",
};
