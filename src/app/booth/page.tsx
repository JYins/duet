"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCw, Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useSegmentation } from "@/hooks/use-segmentation";
import { captureFrame } from "@/lib/camera";
import { applyMask } from "@/lib/mask";
import { generateStrip } from "@/lib/composite";
import type { LutPreset } from "@/lib/lut";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";
import LutPicker from "@/components/lut-picker";

const TOTAL_SHOTS = 4;

type Phase = "ready" | "shooting" | "processing" | "done";

export default function BoothPage() {
  const { videoRef, ready, error, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(3);
  const seg = useSegmentation();

  const [phase, setPhase] = useState<Phase>("ready");
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [stripUrl, setStripUrl] = useState<string | null>(null);

  const cutoutsRef = useRef<string[]>([]);

  useEffect(() => {
    start("user");
    seg.init();
  }, [start, seg.init]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !seg.ready) return;

    setPhase("shooting");
    cutoutsRef.current = [];
    setShotCount(0);

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      await runCountdown();

      setFlash(true);
      setTimeout(() => setFlash(false), 50);

      const frame = captureFrame(videoRef.current);
      const mask = await seg.segment(videoRef.current);
      const cutout = await applyMask(frame, mask);
      cutoutsRef.current.push(cutout);
      setShotCount(i + 1);
    }

    setPhase("processing");
    stop();

    const strip = await generateStrip({
      cutouts: cutoutsRef.current,
      lut,
      grain: true,
      vignette: true,
    });
    setStripUrl(strip);
    setPhase("done");
  }, [ready, seg.ready, videoRef, runCountdown, seg.segment, stop, lut]);

  // re-generate strip when LUT changes after shooting
  const regrade = useCallback(
    async (preset: LutPreset) => {
      setLut(preset);
      if (phase !== "done" || cutoutsRef.current.length === 0) return;

      setPhase("processing");
      const strip = await generateStrip({
        cutouts: cutoutsRef.current,
        lut: preset,
        grain: true,
        vignette: true,
      });
      setStripUrl(strip);
      setPhase("done");
    },
    [phase],
  );

  const retake = useCallback(() => {
    cutoutsRef.current = [];
    setShotCount(0);
    setStripUrl(null);
    setPhase("ready");
    start("user");
  }, [start]);

  const modelReady = seg.ready && ready;
  const modelLoading = seg.loading || !ready;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[#F5F2EA]">
      {/* top bar */}
      <header className="flex w-full max-w-lg items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-3 sm:px-6 sm:pt-8">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-serif text-base italic text-[#2C2C2A]/40 sm:text-lg"
        >
          duet
        </motion.span>

        {seg.runtime && phase !== "done" && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-full bg-[#EDE9DF] px-2 py-0.5 text-[9px] tracking-wider text-[#8A8780] uppercase sm:px-2.5 sm:text-[10px]"
          >
            {seg.runtime}
          </motion.span>
        )}
      </header>

      {/* main content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {phase !== "done" ? (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-5 sm:gap-6"
            >
              {/* viewfinder */}
              <div className="relative">
                <Viewfinder ref={videoRef} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />

                {modelLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2
                      size={20}
                      className="animate-spin text-white/80"
                    />
                    <p className="text-[11px] tracking-wide text-white/60 sm:text-xs">
                      {seg.loading
                        ? "loading segmentation model..."
                        : "starting camera..."}
                    </p>
                  </div>
                )}

                {phase === "processing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#F5F2EA]/80 backdrop-blur-sm">
                    <Loader2
                      size={20}
                      className="animate-spin text-[#2C2C2A]/60"
                    />
                    <p className="text-[11px] tracking-wide text-[#2C2C2A]/50 sm:text-xs">
                      compositing your strip...
                    </p>
                  </div>
                )}

                {(error || seg.error) && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-5">
                    <p className="text-center text-xs leading-relaxed text-white/70 sm:text-sm">
                      {error || seg.error}
                    </p>
                  </div>
                )}
              </div>

              {/* shot counter */}
              <ShotCounter total={TOTAL_SHOTS} current={shotCount} />

              {/* LUT picker — visible before shooting starts */}
              {phase === "ready" && modelReady && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <LutPicker value={lut} onChange={setLut} />
                </motion.div>
              )}

              {/* controls */}
              <div className="flex items-center gap-5">
                <button
                  onClick={flip}
                  disabled={phase === "shooting" || phase === "processing"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A]/60 transition-all duration-300 hover:border-[#D4A574] hover:text-[#2C2C2A] disabled:opacity-30 sm:h-10 sm:w-10"
                  aria-label="flip camera"
                >
                  <RefreshCw size={15} />
                </button>

                <button
                  onClick={shoot}
                  disabled={
                    !modelReady ||
                    phase === "shooting" ||
                    phase === "processing"
                  }
                  className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 sm:h-16 sm:w-16"
                  aria-label="take 4 photos"
                >
                  <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 transition-all duration-300 group-hover:border-[#D4A574]/40" />
                  <Camera size={18} className="text-[#F5F2EA] sm:h-5 sm:w-5" />
                </button>

                <div className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>

              {/* hint */}
              {phase === "ready" && modelReady && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="text-[10px] tracking-wide text-[#8A8780] sm:text-xs"
                >
                  tap to take {TOTAL_SHOTS} photos
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              {stripUrl && (
                <>
                  <StripResult stripUrl={stripUrl} onRetake={retake} />
                  {/* LUT picker for re-grading after shoot */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    <LutPicker value={lut} onChange={regrade} />
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
