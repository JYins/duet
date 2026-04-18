// WebGL2 LUT (Look-Up Table) color grading
//
// loads a .cube file and applies it to an image via fragment shader.
// the entire composite gets one LUT so both subjects share the same
// color space — this is the key trick for the "same room" illusion.

// ---- .cube parser ----

export interface LutData {
  size: number;
  table: Float32Array; // flattened RGB, size^3 * 3
}

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

    // skip other metadata
    if (line.startsWith("DOMAIN_MIN") || line.startsWith("DOMAIN_MAX")) continue;

    const parts = line.split(/\s+/).map(Number);
    if (parts.length >= 3 && !isNaN(parts[0])) {
      values.push(parts[0], parts[1], parts[2]);
    }
  }

  if (size === 0 || values.length !== size * size * size * 3) {
    throw new Error(
      `invalid .cube: size=${size}, got ${values.length / 3} entries, expected ${size ** 3}`,
    );
  }

  return { size, table: new Float32Array(values) };
}

// ---- WebGL2 LUT shader ----

const VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform highp sampler3D u_lut;
uniform float u_intensity; // 0.0 = no effect, 1.0 = full LUT

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_image, v_uv);

  // scale to LUT coordinates (center of texel)
  vec3 lutCoord = color.rgb;
  vec3 graded = texture(u_lut, lutCoord).rgb;

  // blend original and graded
  vec3 result = mix(color.rgb, graded, u_intensity);
  fragColor = vec4(result, color.a);
}`;

function createShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`shader compile failed: ${log}`);
  }
  return s;
}

export interface LutRenderer {
  apply(image: TexImageSource, lut: LutData, intensity?: number): ImageData;
  dispose(): void;
}

export function createLutRenderer(width: number, height: number): LutRenderer {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const gl = canvas.getContext("webgl2", { premultipliedAlpha: false })!;
  if (!gl) throw new Error("WebGL2 not supported");

  // program
  const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`program link failed: ${gl.getProgramInfoLog(prog)}`);
  }

  // fullscreen quad
  const quad = new Float32Array([
    // pos       uv
    -1, -1,  0, 1,
     1, -1,  1, 1,
    -1,  1,  0, 0,
     1,  1,  1, 0,
  ]);
  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const aUv = gl.getAttribLocation(prog, "a_uv");
  const uImage = gl.getUniformLocation(prog, "u_image");
  const uLut = gl.getUniformLocation(prog, "u_lut");
  const uIntensity = gl.getUniformLocation(prog, "u_intensity");

  // textures
  const imgTex = gl.createTexture()!;
  const lutTex = gl.createTexture()!;

  return {
    apply(image, lut, intensity = 1.0) {
      gl.viewport(0, 0, width, height);
      gl.useProgram(prog);

      // bind quad
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

      // upload image texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(uImage, 0);

      // upload 3D LUT texture
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, lutTex);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.RGB32F,
        lut.size,
        lut.size,
        lut.size,
        0,
        gl.RGB,
        gl.FLOAT,
        lut.table,
      );
      gl.uniform1i(uLut, 1);

      gl.uniform1f(uIntensity, intensity);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // read back
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // WebGL reads bottom-up, flip vertically
      const out = new ImageData(width, height);
      for (let y = 0; y < height; y++) {
        const srcRow = (height - 1 - y) * width * 4;
        const dstRow = y * width * 4;
        out.data.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow);
      }

      return out;
    },

    dispose() {
      gl.deleteTexture(imgTex);
      gl.deleteTexture(lutTex);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(vbo);
    },
  };
}

// ---- built-in LUTs (no .cube file needed for MVP) ----
// procedurally generated so we don't need to ship .cube files yet

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

// warm film — push shadows warm, highlights slightly golden
export function generateWarmFilmLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);

        // lift shadows, compress highlights (film curve)
        const lift = 0.03;
        const rr = lift + rf * (1.0 - lift) * 1.02;
        const gg = lift + gf * (1.0 - lift) * 0.98;
        const bb = lift + bf * (1.0 - lift) * 0.90;

        table[idx++] = Math.min(1, rr);
        table[idx++] = Math.min(1, gg);
        table[idx++] = Math.min(1, bb);
      }
    }
  }
  return { size, table };
}

// cool desaturated — slight blue shift, lower saturation
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
        const desat = 0.35;

        const rr = rf * (1 - desat) + lum * desat - 0.01;
        const gg = gf * (1 - desat) + lum * desat + 0.01;
        const bb = bf * (1 - desat) + lum * desat + 0.04;

        table[idx++] = Math.max(0, Math.min(1, rr));
        table[idx++] = Math.max(0, Math.min(1, gg));
        table[idx++] = Math.max(0, Math.min(1, bb));
      }
    }
  }
  return { size, table };
}

// high contrast bw
export function generateBWLut(size = 16): LutData {
  const table = new Float32Array(size * size * size * 3);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);

        let lum = 0.299 * rf + 0.587 * gf + 0.114 * bf;
        // S-curve for contrast
        lum = lum < 0.5
          ? 2 * lum * lum
          : 1 - 2 * (1 - lum) * (1 - lum);
        // slight warm tint in shadows
        const rr = lum + 0.01;
        const gg = lum;
        const bb = lum - 0.015;

        table[idx++] = Math.max(0, Math.min(1, rr));
        table[idx++] = Math.max(0, Math.min(1, gg));
        table[idx++] = Math.max(0, Math.min(1, bb));
      }
    }
  }
  return { size, table };
}

export type LutPreset = "none" | "warm-film" | "cool-desat" | "bw";

export function getLutByPreset(preset: LutPreset): LutData {
  switch (preset) {
    case "warm-film":
      return generateWarmFilmLut();
    case "cool-desat":
      return generateCoolDesatLut();
    case "bw":
      return generateBWLut();
    default:
      return generateIdentityLut();
  }
}

export const LUT_PRESETS: { id: LutPreset; label: string }[] = [
  { id: "none", label: "natural" },
  { id: "warm-film", label: "portra" },
  { id: "cool-desat", label: "cool" },
  { id: "bw", label: "mono" },
];
