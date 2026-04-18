// depth-of-field effect: gaussian blur on background, keep person sharp
//
// takes original frame + segmentation mask, returns blurred-background version.
// the blur intensity is controllable via a 0-100 slider.

export function applyDepthBlur(
  original: string,
  mask: ImageData,
  intensity: number, // 0-100
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = mask.width;
      const h = mask.height;

      // canvas for blurred background
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = w;
      blurCanvas.height = h;
      const blurCtx = blurCanvas.getContext("2d")!;

      // draw original and apply CSS blur
      const blurPx = Math.round((intensity / 100) * 20); // max 20px blur
      blurCtx.filter = `blur(${blurPx}px)`;
      blurCtx.drawImage(img, 0, 0, w, h);
      blurCtx.filter = "none";

      // canvas for sharp person
      const sharpCanvas = document.createElement("canvas");
      sharpCanvas.width = w;
      sharpCanvas.height = h;
      const sharpCtx = sharpCanvas.getContext("2d")!;

      // draw original
      sharpCtx.drawImage(img, 0, 0, w, h);

      // mask out background (keep only person)
      const sharpData = sharpCtx.getImageData(0, 0, w, h);
      for (let i = 0; i < w * h; i++) {
        const personAlpha = mask.data[i * 4 + 3];
        if (personAlpha < 128) {
          // background pixel — make transparent
          sharpData.data[i * 4 + 3] = 0;
        }
      }
      sharpCtx.putImageData(sharpData, 0, 0);

      // composite: blurred bg + sharp person on top
      const outCanvas = document.createElement("canvas");
      outCanvas.width = w;
      outCanvas.height = h;
      const outCtx = outCanvas.getContext("2d")!;

      outCtx.drawImage(blurCanvas, 0, 0);
      outCtx.drawImage(sharpCanvas, 0, 0);

      resolve(outCanvas.toDataURL("image/png"));
    };
    img.src = original;
  });
}
