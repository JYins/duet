// unified segmentation interface — dual engine (MediaPipe + TF.js)
//
// why dual engine: MediaPipe is fastest on desktop Chrome and Android.
// TF.js + WebGL is faster and more stable on iOS Safari where MediaPipe
// WASM runtime can crash on older devices.
//
// why CDN for TF.js: the @tensorflow-models/body-segmentation npm package
// has a broken ESM export for @mediapipe/selfie_segmentation that fails
// with Turbopack. loading via CDN script tags sidesteps this entirely.

import { detectRuntime, type Runtime } from "./detect";

export interface SegmentationEngine {
  runtime: Runtime;
  segment(source: HTMLVideoElement | HTMLImageElement): Promise<ImageData>;
  dispose(): void;
}

// ---- MediaPipe backend (npm, works great with Turbopack) ----

async function createMediaPipeEngine(): Promise<SegmentationEngine> {
  const vision = await import("@mediapipe/tasks-vision");
  const { ImageSegmenter, FilesetResolver } = vision;

  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  );

  const segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });

  return {
    runtime: "mediapipe",

    async segment(source) {
      const w =
        source instanceof HTMLVideoElement
          ? source.videoWidth
          : source.naturalWidth;
      const h =
        source instanceof HTMLVideoElement
          ? source.videoHeight
          : source.naturalHeight;

      // draw source to canvas for consistent input
      const inCanvas = document.createElement("canvas");
      inCanvas.width = w;
      inCanvas.height = h;
      const inCtx = inCanvas.getContext("2d")!;
      inCtx.drawImage(source, 0, 0);

      const result = segmenter.segment(inCanvas);
      const categoryMask = result.categoryMask;

      if (!categoryMask) {
        throw new Error("mediapipe returned no category mask");
      }

      const maskData = categoryMask.getAsUint8Array();

      // build RGBA mask: white where person, transparent where background
      const out = new ImageData(w, h);
      for (let i = 0; i < maskData.length; i++) {
        // selfie_segmenter: 0 = background, 255 = person
        // but category mask maps: 0 = person, non-zero = background
        const isPerson = maskData[i] === 0;
        const pi = i * 4;
        out.data[pi] = 255;
        out.data[pi + 1] = 255;
        out.data[pi + 2] = 255;
        out.data[pi + 3] = isPerson ? 255 : 0;
      }

      categoryMask.close();
      return out;
    },

    dispose() {
      segmenter.close();
    },
  };
}

// ---- TF.js backend (CDN loaded to avoid Turbopack ESM issue) ----

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function createTfjsEngine(): Promise<SegmentationEngine> {
  // load TF.js + body-segmentation from CDN
  await loadScript(
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.22.0/dist/tf-core.min.js",
  );
  await loadScript(
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.22.0/dist/tf-backend-webgl.min.js",
  );
  await loadScript(
    "https://cdn.jsdelivr.net/npm/@tensorflow-models/body-segmentation@1.0.2/dist/body-segmentation.min.js",
  );
  await loadScript(
    "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.min.js",
  );

  const tf = (window as any).tf;
  const bodySegmentation = (window as any).bodySegmentation;

  await tf.setBackend("webgl");
  await tf.ready();

  const segmenter = await bodySegmentation.createSegmenter(
    bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
    {
      runtime: "mediapipe",
      solutionPath:
        "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747",
      modelType: "general",
    },
  );

  return {
    runtime: "tfjs",

    async segment(source) {
      const w =
        source instanceof HTMLVideoElement
          ? source.videoWidth
          : source.naturalWidth;
      const h =
        source instanceof HTMLVideoElement
          ? source.videoHeight
          : source.naturalHeight;

      const results = await segmenter.segmentPeople(source, {
        flipHorizontal: false,
        multiSegmentation: false,
        segmentBodyParts: false,
      });

      if (!results.length || !results[0].mask) {
        throw new Error("tfjs returned no segmentation mask");
      }

      const maskSource = await results[0].mask.toCanvasImageSource();

      // draw mask to canvas to read pixels
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = w;
      tmpCanvas.height = h;
      const tmpCtx = tmpCanvas.getContext("2d")!;
      tmpCtx.drawImage(maskSource, 0, 0, w, h);
      const maskImageData = tmpCtx.getImageData(0, 0, w, h);

      // build RGBA mask: person = white opaque, background = transparent
      const out = new ImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const confidence = maskImageData.data[i * 4]; // red channel
        const isPerson = confidence > 128;
        const pi = i * 4;
        out.data[pi] = 255;
        out.data[pi + 1] = 255;
        out.data[pi + 2] = 255;
        out.data[pi + 3] = isPerson ? 255 : 0;
      }

      return out;
    },

    dispose() {
      segmenter.close();
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- factory ----

let cached: SegmentationEngine | null = null;

export async function getSegmenter(): Promise<SegmentationEngine> {
  if (cached) return cached;

  const runtime = detectRuntime();
  console.log(`[duet] using ${runtime} segmentation runtime`);

  try {
    cached =
      runtime === "mediapipe"
        ? await createMediaPipeEngine()
        : await createTfjsEngine();
  } catch (e) {
    // if primary fails, try the other one
    console.warn(`[duet] ${runtime} failed, falling back`, e);
    cached =
      runtime === "mediapipe"
        ? await createTfjsEngine()
        : await createMediaPipeEngine();
  }

  return cached;
}

export function disposeSegmenter() {
  if (cached) {
    cached.dispose();
    cached = null;
  }
}
