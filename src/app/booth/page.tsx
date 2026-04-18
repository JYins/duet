"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCw, Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useSegmentation } from "@/hooks/use-segmentation";
import { captureFrame } from "@/lib/camera";
import { applyMask } from "@/lib/mask";
import { applyDepthBlur } from "@/lib/blur";
import { generateStrip } from "@/lib/composite";
import type { LutPreset } from "@/lib/lut";
import type { Background } from "@/lib/backgrounds";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";
import LutPicker from "@/components/lut-picker";
import BgPicker from "@/components/bg-picker";
import DepthSlider from "@/components/depth-slider";
import { useLocale } from "@/hooks/use-locale";

const TOTAL_SHOTS = 4;

type Phase = "ready" | "shooting" | "processing" | "done";

interface CapturedFrame {
  raw: string;
  mask: ImageData;
  cutout: string;
}

export default function BoothPage() {
  const { videoRef, ready, error, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(3);
  const seg = useSegmentation();

  const [phase, setPhase] = useState<Phase>("ready");
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [bgId, setBgId] = useState("cream");
  const [bgUrl, setBgUrl] = useState<string | undefined>(undefined);
  const [depth, setDepth] = useState(0);
  const [stripUrl, setStripUrl] = useState<string | null>(null);

  const { t } = useLocale();
  const framesRef = useRef<CapturedFrame[]>([]);

  useEffect(() => {
    start("user");
    seg.init();
  }, [start, seg.init]);

  // generate strip from captured frames with current settings
  const composite = useCallback(
    async (frames: CapturedFrame[], opts: { lut: LutPreset; bg?: string; depth: number }) => {
      let cutouts = frames.map((f) => f.cutout);

      // apply depth blur if > 0
      if (opts.depth > 0) {
        cutouts = await Promise.all(
          frames.map((f) => applyDepthBlur(f.raw, f.mask, opts.depth)),
        );
      }

      return generateStrip({
        cutouts,
        background: opts.bg,
        lut: opts.lut,
        grain: true,
        vignette: true,
      });
    },
    [],
  );

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !seg.ready) return;

    setPhase("shooting");
    framesRef.current = [];
    setShotCount(0);

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      await runCountdown();
      setFlash(true);
      setTimeout(() => setFlash(false), 50);

      const raw = captureFrame(videoRef.current);
      const mask = await seg.segment(videoRef.current);
      const cutout = await applyMask(raw, mask);
      framesRef.current.push({ raw, mask, cutout });
      setShotCount(i + 1);
    }

    setPhase("processing");
    stop();

    const strip = await composite(framesRef.current, { lut, bg: bgUrl, depth });
    setStripUrl(strip);
    setPhase("done");
  }, [ready, seg.ready, videoRef, runCountdown, seg.segment, stop, lut, bgUrl, depth, composite]);

  // re-composite when settings change after shooting
  const recomposite = useCallback(
    async (newLut: LutPreset, newBg?: string, newDepth?: number) => {
      if (framesRef.current.length === 0) return;
      setPhase("processing");
      const strip = await composite(framesRef.current, {
        lut: newLut,
        bg: newBg,
        depth: newDepth ?? depth,
      });
      setStripUrl(strip);
      setPhase("done");
    },
    [depth, composite],
  );

  const handleLutChange = useCallback(
    (preset: LutPreset) => {
      setLut(preset);
      if (phase === "done") recomposite(preset, bgUrl, depth);
    },
    [phase, bgUrl, depth, recomposite],
  );

  const handleBgChange = useCallback(
    (bg: Background) => {
      setBgId(bg.id);
      setBgUrl(bg.url ?? undefined);
      if (phase === "done") recomposite(lut, bg.url ?? undefined, depth);
    },
    [phase, lut, depth, recomposite],
  );

  const handleDepthChange = useCallback(
    (v: number) => {
      setDepth(v);
      // debounce: only recomposite on release (onMouseUp/onTouchEnd)
      // for now just update state — user can tap "apply" or we recomposite on done
    },
    [],
  );

  // recomposite when depth slider stops (on pointer up)
  const handleDepthCommit = useCallback(() => {
    if (phase === "done") recomposite(lut, bgUrl, depth);
  }, [phase, lut, bgUrl, depth, recomposite]);

  const retake = useCallback(() => {
    framesRef.current = [];
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
          Duet
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

      {/* main */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {phase !== "done" ? (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 sm:gap-5"
            >
              {/* viewfinder */}
              <div className="relative">
                <Viewfinder ref={videoRef} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />

                {modelLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-white/80" />
                    <p className="text-[11px] tracking-wide text-white/60 sm:text-xs">
                      {seg.loading ? t("booth.loadingModel") : t("booth.startingCamera")}
                    </p>
                  </div>
                )}

                {phase === "processing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#F5F2EA]/80 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-[#2C2C2A]/60" />
                    <p className="text-[11px] tracking-wide text-[#2C2C2A]/50 sm:text-xs">
                      {t("booth.compositing")}
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

              {/* settings — before shooting */}
              {phase === "ready" && modelReady && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-3"
                >
                  <BgPicker value={bgId} onChange={handleBgChange} />
                  <LutPicker value={lut} onChange={handleLutChange} />
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
                  disabled={!modelReady || phase === "shooting" || phase === "processing"}
                  className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 sm:h-16 sm:w-16"
                  aria-label="take 4 photos"
                >
                  <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 transition-all duration-300 group-hover:border-[#D4A574]/40" />
                  <Camera size={18} className="text-[#F5F2EA] sm:h-5 sm:w-5" />
                </button>

                <div className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>

              {phase === "ready" && modelReady && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="text-[10px] tracking-wide text-[#8A8780] sm:text-xs"
                >
                  {t("booth.tapToShoot")}
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-5"
            >
              {stripUrl && <StripResult stripUrl={stripUrl} onRetake={retake} />}

              {/* post-shoot controls */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-3"
              >
                <BgPicker value={bgId} onChange={handleBgChange} />
                <LutPicker value={lut} onChange={handleLutChange} />
                <div onPointerUp={handleDepthCommit} onTouchEnd={handleDepthCommit}>
                  <DepthSlider value={depth} onChange={handleDepthChange} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
