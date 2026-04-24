// LUT color grading — pure Canvas 2D implementation
// no WebGL dependency, works on all browsers including iOS Safari
//
// applies color transform to every pixel via lookup table

export interface LutData {
  size: number;
  table: Float32Array; // flattened RGB, size^3 * 3
}

// ---- helpers ----

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function applyLift(v: number, lift: number): number {
  return lift + v * (1 - lift);
}

function applyContrast(v: number, factor: number): number {
  return 0.5 + (v - 0.5) * factor;
}

function lum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
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

// warm film — Kodak Portra 400 style
export function generateWarmFilmLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  const lift = 0.03;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        table[idx++] = clamp01(applyLift(rf, lift) * 1.02);
        table[idx++] = clamp01(applyLift(gf, lift) * 0.98);
        table[idx++] = clamp01(applyLift(bf, lift) * 0.90);
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
        const l = lum(rf, gf, bf);
        const d = 0.35;
        table[idx++] = clamp01(rf * (1 - d) + l * d - 0.01);
        table[idx++] = clamp01(gf * (1 - d) + l * d + 0.01);
        table[idx++] = clamp01(bf * (1 - d) + l * d + 0.04);
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
        let l = lum(r / (size - 1), g / (size - 1), b / (size - 1));
        l = l < 0.5 ? 2 * l * l : 1 - 2 * (1 - l) * (1 - l);
        table[idx++] = clamp01(l + 0.01);
        table[idx++] = clamp01(l);
        table[idx++] = clamp01(l - 0.015);
      }
    }
  }
  return { size, table };
}

// fuji-400h — 富士清新，低对比，阴影偏绿，轻微过曝
export function generateFuji400hLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const nr = applyContrast(applyLift(rf, 0.05), 0.90);
        const ng = applyContrast(applyLift(gf, 0.05), 0.90);
        const nb = applyContrast(applyLift(bf, 0.05), 0.90);
        const shadowWeight = 1 - Math.max(nr, ng, nb);
        const greenShift = shadowWeight * 0.025;
        table[idx++] = clamp01(nr * 1.02);
        table[idx++] = clamp01(ng * 1.03 + greenShift);
        table[idx++] = clamp01(nb * 0.98 + greenShift * 0.5);
      }
    }
  }
  return { size, table };
}

// polaroid — 宝丽来，高对比，偏青，过曝
export function generatePolaroidLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const nr = applyContrast(applyLift(rf, 0.02), 1.12) * 1.04;
        const ng = applyContrast(applyLift(gf, 0.02), 1.12) * 1.04;
        const nb = applyContrast(applyLift(bf, 0.02), 1.12) * 1.06;
        table[idx++] = clamp01(nr - 0.015);
        table[idx++] = clamp01(ng + 0.005);
        table[idx++] = clamp01(nb + 0.015);
      }
    }
  }
  return { size, table };
}

// sepia — 复古棕褐
export function generateSepiaLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const l = lum(r / (size - 1), g / (size - 1), b / (size - 1));
        table[idx++] = clamp01(l * 1.05 + 0.08);
        table[idx++] = clamp01(l * 0.95 + 0.05);
        table[idx++] = clamp01(l * 0.75 + 0.02);
      }
    }
  }
  return { size, table };
}

// cinematic — 电影感，低饱和，高对比，teal/orange
export function generateCinematicLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const l = lum(rf, gf, bf);
        let nr = l + (rf - l) * 0.72;
        let ng = l + (gf - l) * 0.72;
        let nb = l + (bf - l) * 0.72;
        nr = applyContrast(nr, 1.15);
        ng = applyContrast(ng, 1.15);
        nb = applyContrast(nb, 1.15);
        nr *= 0.94; ng *= 0.94; nb *= 0.94;
        const highlight = Math.max(nr, ng, nb);
        const shadow = 1 - highlight;
        nr += shadow * (-0.02) + highlight * 0.015;
        ng += shadow * 0.005 + highlight * 0.005;
        nb += shadow * 0.015 + highlight * (-0.01);
        table[idx++] = clamp01(nr);
        table[idx++] = clamp01(ng);
        table[idx++] = clamp01(nb);
      }
    }
  }
  return { size, table };
}

// faded — 褪色胶片，低对比，雾感
export function generateFadedLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const nr = applyContrast(applyLift(rf, 0.10), 0.82);
        const ng = applyContrast(applyLift(gf, 0.10), 0.82);
        const nb = applyContrast(applyLift(bf, 0.10), 0.82);
        const l = lum(nr, ng, nb);
        table[idx++] = clamp01(l + (nr - l) * 0.70);
        table[idx++] = clamp01(l + (ng - l) * 0.70);
        table[idx++] = clamp01(l + (nb - l) * 0.70);
      }
    }
  }
  return { size, table };
}

// golden — 黄金年代，暖金色调
export function generateGoldenLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const lift = 0.03;
        const nr = applyLift(rf, lift) * 1.06;
        const ng = applyLift(gf, lift) * 1.02;
        const nb = applyLift(bf, lift) * 0.82;
        const highlight = Math.max(nr, ng, nb);
        const goldBoost = highlight * 0.04;
        table[idx++] = clamp01(nr + goldBoost);
        table[idx++] = clamp01(ng + goldBoost * 0.8);
        table[idx++] = clamp01(nb);
      }
    }
  }
  return { size, table };
}

// lomo — Lomo风格，高饱和，紫调
export function generateLomoLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const l = lum(rf, gf, bf);
        let nr = l + (rf - l) * 1.35;
        let ng = l + (gf - l) * 1.25;
        let nb = l + (bf - l) * 1.30;
        nr = applyContrast(nr, 1.15);
        ng = applyContrast(ng, 1.15);
        nb = applyContrast(nb, 1.15);
        nr += 0.015;
        nb += 0.02;
        ng -= 0.005;
        table[idx++] = clamp01(nr);
        table[idx++] = clamp01(ng);
        table[idx++] = clamp01(nb);
      }
    }
  }
  return { size, table };
}

// instant — 拍立得，冷调，过曝
export function generateInstantLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const nr = applyContrast(applyLift(rf, 0.03), 0.90) * 1.08;
        const ng = applyContrast(applyLift(gf, 0.03), 0.90) * 1.06;
        const nb = applyContrast(applyLift(bf, 0.03), 0.90) * 1.10;
        table[idx++] = clamp01(nr - 0.01);
        table[idx++] = clamp01(ng + 0.005);
        table[idx++] = clamp01(nb + 0.02);
      }
    }
  }
  return { size, table };
}

// ---- preset registry ----

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
  { id: "none", label: "natural" },
  { id: "warm-film", label: "portra" },
  { id: "fuji-400h", label: "fuji" },
  { id: "cool-desat", label: "cool" },
  { id: "polaroid", label: "polaroid" },
  { id: "sepia", label: "sepia" },
  { id: "cinematic", label: "cine" },
  { id: "faded", label: "faded" },
  { id: "golden", label: "golden" },
  { id: "lomo", label: "lomo" },
  { id: "instant", label: "instant" },
  { id: "bw", label: "mono" },
];

// CSS filter approximations for real-time viewfinder preview and capture
// exact LUT is still applied pixel-by-pixel during composite when needed
export const LUT_CSS_FILTERS: Record<LutPreset, string> = {
  "none": "none",
  "warm-film": "sepia(0.15) saturate(1.1) brightness(1.03) contrast(0.97)",
  "cool-desat": "saturate(0.65) brightness(1.02) hue-rotate(10deg)",
  "bw": "grayscale(1) contrast(1.3) brightness(1.05)",
  "fuji-400h": "saturate(0.85) contrast(0.95) brightness(1.05) hue-rotate(-5deg)",
  "polaroid": "contrast(1.12) brightness(1.06) saturate(0.92) sepia(0.04)",
  "sepia": "sepia(0.55) contrast(1.08) brightness(0.96)",
  "cinematic": "saturate(0.72) contrast(1.12) brightness(0.94)",
  "faded": "contrast(0.87) brightness(1.06) saturate(0.72)",
  "golden": "sepia(0.22) saturate(1.12) brightness(1.02) contrast(1.04)",
  "lomo": "saturate(1.25) contrast(1.15) brightness(0.96) hue-rotate(12deg)",
  "instant": "brightness(1.08) contrast(0.92) saturate(0.82) hue-rotate(5deg)",
};
