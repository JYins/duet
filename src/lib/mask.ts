// apply segmentation mask to extract portrait from source image

export function applyMask(
  source: string,
  mask: ImageData,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = mask.width;
      const h = mask.height;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // draw source
      ctx.drawImage(img, 0, 0, w, h);

      // get source pixels
      const srcData = ctx.getImageData(0, 0, w, h);

      // apply mask alpha — keep person, remove background
      for (let i = 0; i < w * h; i++) {
        srcData.data[i * 4 + 3] = mask.data[i * 4 + 3];
      }

      ctx.putImageData(srcData, 0, 0);

      // feather edges with a slight blur for natural look
      // for now just output raw mask — feathering comes later with grain overlay
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = source;
  });
}
