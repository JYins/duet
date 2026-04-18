"use client";

import { useEffect, useState, useCallback } from "react";
import { Camera, RefreshCw, RotateCcw, Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useSegmentation } from "@/hooks/use-segmentation";
import { captureFrame } from "@/lib/camera";
import { applyMask } from "@/lib/mask";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import PhotoStrip from "@/components/photo-strip";

const TOTAL_SHOTS = 4;

export default function BoothPage() {
  const { videoRef, ready, error, start, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(3);
  const seg = useSegmentation();
  const [photos, setPhotos] = useState<string[]>([]);
  const [cutouts, setCutouts] = useState<string[]>([]);
  const [shooting, setShooting] = useState(false);

  // start camera + load segmentation model in parallel
  useEffect(() => {
    start("user");
    seg.init();
  }, [start, seg.init]);

  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !ready || !seg.ready) return;

    setShooting(true);
    const newPhotos: string[] = [];
    const newCutouts: string[] = [];

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      await runCountdown();

      // capture raw frame
      const frame = captureFrame(videoRef.current);
      newPhotos.push(frame);
      setPhotos([...newPhotos]);

      // segment and extract portrait
      const mask = await seg.segment(videoRef.current);
      const cutout = await applyMask(frame, mask);
      newCutouts.push(cutout);
      setCutouts([...newCutouts]);
    }

    setShooting(false);
  }, [ready, seg.ready, videoRef, runCountdown, seg.segment]);

  const reset = useCallback(() => {
    setPhotos([]);
    setCutouts([]);
  }, []);

  const done = photos.length === TOTAL_SHOTS;
  const modelLoading = seg.loading;

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#F5F2EA] px-4 py-8">
      {/* status bar */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-lg font-light tracking-wide text-[#2C2C2A]">
          {done ? "your strip" : `${photos.length} / ${TOTAL_SHOTS}`}
        </h1>
        {seg.runtime && (
          <span className="rounded-full bg-[#EDE9DF] px-2.5 py-0.5 text-xs text-[#8A8780]">
            {seg.runtime}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        {/* camera */}
        <div className="relative">
          <Viewfinder ref={videoRef} />
          <CountdownOverlay count={count} />

          {/* model loading overlay */}
          {modelLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/60">
              <Loader2 size={24} className="animate-spin text-white" />
              <p className="text-sm text-white/80">loading segmentation model...</p>
            </div>
          )}

          {(error || seg.error) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-4">
              <p className="text-center text-sm text-white/80">
                {error || seg.error}
              </p>
            </div>
          )}
        </div>

        {/* strips: raw + cutout */}
        <div className="flex gap-4">
          {photos.length > 0 && <PhotoStrip photos={photos} label="original" />}
          {cutouts.length > 0 && <PhotoStrip photos={cutouts} label="portrait" />}
        </div>
      </div>

      {/* controls */}
      <div className="mt-8 flex items-center gap-4">
        {!done && (
          <>
            <button
              onClick={flip}
              disabled={shooting}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A] transition-colors hover:bg-[#EDE9DF] disabled:opacity-40"
              aria-label="flip camera"
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={takePhoto}
              disabled={shooting || !ready || !seg.ready}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] text-[#F5F2EA] transition-opacity hover:opacity-80 disabled:opacity-40"
              aria-label="take photos"
            >
              <Camera size={22} />
            </button>
          </>
        )}

        {done && (
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-full border border-[#DDD9D0] px-5 py-2.5 text-sm text-[#2C2C2A] transition-colors hover:bg-[#EDE9DF]"
          >
            <RotateCcw size={16} />
            retake
          </button>
        )}
      </div>
    </main>
  );
}
