"use client";

import { useEffect, useState, useCallback } from "react";
import { Camera, RefreshCw, RotateCcw } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { captureFrame } from "@/lib/camera";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import PhotoStrip from "@/components/photo-strip";

const TOTAL_SHOTS = 4;

export default function BoothPage() {
  const { videoRef, ready, error, start, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(3);
  const [photos, setPhotos] = useState<string[]>([]);
  const [shooting, setShooting] = useState(false);

  useEffect(() => {
    start("user");
  }, [start]);

  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !ready) return;

    setShooting(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      await runCountdown();
      const frame = captureFrame(videoRef.current);
      newPhotos.push(frame);
      setPhotos([...newPhotos]);
    }

    setShooting(false);
  }, [ready, videoRef, runCountdown]);

  const reset = useCallback(() => {
    setPhotos([]);
  }, []);

  const done = photos.length === TOTAL_SHOTS;

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#F5F2EA] px-4 py-8">
      <h1 className="mb-6 text-lg font-light tracking-wide text-[#2C2C2A]">
        {done ? "your strip" : `${photos.length} / ${TOTAL_SHOTS}`}
      </h1>

      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        {/* camera */}
        <div className="relative">
          <Viewfinder ref={videoRef} />
          <CountdownOverlay count={count} />

          {error && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-4">
              <p className="text-center text-sm text-white/80">{error}</p>
            </div>
          )}
        </div>

        {/* strip preview */}
        {photos.length > 0 && <PhotoStrip photos={photos} />}
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
              disabled={shooting || !ready}
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
