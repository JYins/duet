// apply segmentation mask to extract portrait from source image
// with edge feathering to hide segmentation artifacts

export function applyMask(
  source: string,
  mask: ImageData,
  featherRadius = 3,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = mask.width;
      const h = mask.height;

      // feather the mask alpha channel for softer edges
      const feathered = featherRadius > 0 ? featherMask(mask, featherRadius) : mask;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      ctx.drawImage(img, 0, 0, w, h);
      const srcData = ctx.getImageData(0, 0, w, h);

      // apply feathered mask alpha
      for (let i = 0; i < w * h; i++) {
        srcData.data[i * 4 + 3] = feathered.data[i * 4 + 3];
      }

      ctx.putImageData(srcData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = source;
  });
}

// gaussian-approximate edge feathering via repeated box blur on alpha channel
function featherMask(mask: ImageData, radius: number): ImageData {
  const w = mask.width;
  const h = mask.height;

  // extract alpha channel
  const alpha = new Float32Array(w * h) as Float32Array<ArrayBuffer>;
  for (let i = 0; i < w * h; i++) {
    alpha[i] = mask.data[i * 4 + 3];
  }

  // 3 passes of box blur approximates gaussian
  let current: Float32Array<ArrayBuffer> = alpha;
  for (let pass = 0; pass < 3; pass++) {
    current = boxBlurAlpha(current, w, h, radius);
  }

  // write back to ImageData
  const out = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    out.data[i * 4] = 255;
    out.data[i * 4 + 1] = 255;
    out.data[i * 4 + 2] = 255;
    out.data[i * 4 + 3] = Math.round(current[i]);
  }
  return out;
}

function boxBlurAlpha(
  src: Float32Array<ArrayBuffer>,
  w: number,
  h: number,
  r: number,
): Float32Array<ArrayBuffer> {
  const dst = new Float32Array(w * h) as Float32Array<ArrayBuffer>;
  const tmp = new Float32Array(w * h) as Float32Array<ArrayBuffer>;

  // horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w) {
          sum += src[y * w + nx];
          count++;
        }
      }
      tmp[y * w + x] = sum / count;
    }
  }

  // vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < h) {
          sum += tmp[ny * w + x];
          count++;
        }
      }
      dst[y * w + x] = sum / count;
    }
  }

  return dst;
}
