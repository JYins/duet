"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCw, Loader2, Check } from "lucide-react";
import Image from "next/image";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { generateStrip, type FrameLayout } from "@/lib/composite";
import type { LutPreset } from "@/lib/lut";
import { LUT_CSS_FILTERS } from "@/lib/lut";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";
import LutPicker from "@/components/lut-picker";
import LayoutPicker from "@/components/layout-picker";
import LabelInput from "@/components/label-input";

const DEFAULT_COUNTDOWN = 5;
const BETWEEN_SHOT_DELAY = 2000; // 2s pause between shots to let user repose

type Phase = "ready" | "shooting" | "reviewing" | "processing" | "done";

export default function BoothPage() {
  const { videoRef, ready, error, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(DEFAULT_COUNTDOWN);
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("ready");
  const [shotCount, setShotCount] = useState(0);
  const [totalShots, setTotalShots] = useState(4);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [frameLayout, setFrameLayout] = useState<FrameLayout>("1x4");
  const [customLabel, setCustomLabel] = useState("");
  const [countdownSec, setCountdownSec] = useState(DEFAULT_COUNTDOWN);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  // all captured raw photos
  const photosRef = useRef<string[]>([]);
  // selected photos for final strip (if taking more than needed)
  const selectedRef = useRef<string[]>([]);

  // refs for settings (avoid stale closures)
  const lutRef = useRef(lut); lutRef.current = lut;
  const layoutRef = useRef(frameLayout); layoutRef.current = frameLayout;
  const labelRef = useRef(customLabel); labelRef.current = customLabel;

  useEffect(() => {
    start("user");
  }, [start]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const buildStrip = useCallback(
    async (photos: string[]) => {
      return generateStrip({
        photos,
        layout: layoutRef.current,
        lut: lutRef.current,
        grain: true,
        vignette: true,
        label: labelRef.current || undefined,
      });
    },
    [],
  );

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready) return;

    setPhase("shooting");
    photosRef.current = [];
    setShotCount(0);
    setLastCapture(null);

    for (let i = 0; i < totalShots; i++) {
      // countdown
      await runCountdown(countdownSec);

      // flash + capture
      setFlash(true);
      const frame = captureFrame(videoRef.current);
      photosRef.current.push(frame);
      setShotCount(i + 1);
      setLastCapture(frame);

      // brief flash
      await sleep(100);
      setFlash(false);

      // pause between shots (except after last)
      if (i < totalShots - 1) {
        await sleep(BETWEEN_SHOT_DELAY);
        setLastCapture(null);
      }
    }

    // go to review or straight to composite
    stop();
    setPhase("reviewing");
  }, [ready, videoRef, runCountdown, totalShots, countdownSec, stop]);

  // user selects photos (toggle selection) then confirms
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const neededCount = frameLayout === "1x3" ? 3 : frameLayout === "2x3" ? 6 : 4;

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= neededCount) return prev;
      return [...prev, idx];
    });
  }, [neededCount]);

  const confirmSelection = useCallback(async () => {
    const picks = selectedIndices.length > 0
      ? selectedIndices.map((i) => photosRef.current[i])
      : photosRef.current.slice(0, neededCount);

    selectedRef.current = picks;
    setPhase("processing");

    const strip = await buildStrip(picks);
    setStripUrl(strip);
    setPhase("done");
  }, [selectedIndices, neededCount, buildStrip]);

  // auto-confirm if exact count taken
  useEffect(() => {
    if (phase === "reviewing" && photosRef.current.length <= neededCount) {
      selectedRef.current = photosRef.current.slice(0, neededCount);
      setPhase("processing");
      buildStrip(selectedRef.current).then((strip) => {
        setStripUrl(strip);
        setPhase("done");
      });
    }
  }, [phase, neededCount, buildStrip]);

  const regenerate = useCallback(async () => {
    if (selectedRef.current.length === 0) return;
    setPhase("processing");
    const strip = await buildStrip(selectedRef.current);
    setStripUrl(strip);
    setPhase("done");
  }, [buildStrip]);

  const handleLutChange = useCallback(
    (preset: LutPreset) => {
      setLut(preset);
      lutRef.current = preset;
      if (selectedRef.current.length > 0) regenerate();
    },
    [regenerate],
  );

  const handleLayoutChange = useCallback(
    (l: FrameLayout) => {
      setFrameLayout(l);
      layoutRef.current = l;
      if (selectedRef.current.length > 0) regenerate();
    },
    [regenerate],
  );

  const handleLabelBlur = useCallback(() => {
    if (selectedRef.current.length > 0) regenerate();
  }, [regenerate]);

  const retake = useCallback(() => {
    photosRef.current = [];
    selectedRef.current = [];
    setShotCount(0);
    setStripUrl(null);
    setLastCapture(null);
    setSelectedIndices([]);
    setPhase("ready");
    start("user");
  }, [start]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[#F5F2EA]">
      <header className="flex w-full max-w-lg items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-3 sm:px-6 sm:pt-8">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-serif text-base italic text-[#2C2C2A]/40 sm:text-lg"
        >
          Duet
        </motion.span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {/* ---- CAMERA PHASE ---- */}
          {(phase === "ready" || phase === "shooting") && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 sm:gap-5"
            >
              <div className="relative">
                <Viewfinder ref={videoRef} cssFilter={LUT_CSS_FILTERS[lut]} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />

                {!ready && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-white/80" />
                    <p className="text-[11px] tracking-wide text-white/60">
                      {t("booth.startingCamera")}
                    </p>
                  </div>
                )}

                {/* thumbnail of last capture — shown between shots */}
                <AnimatePresence>
                  {lastCapture && phase === "shooting" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      className="absolute bottom-3 right-3 h-16 w-12 overflow-hidden rounded-md border-2 border-white/80 shadow-lg sm:h-20 sm:w-15"
                    >
                      <Image
                        src={lastCapture}
                        alt="last shot"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-[#2C2C2A]/20">
                        <Check size={14} className="text-white" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-5">
                    <p className="text-center text-xs text-white/70">{error}</p>
                  </div>
                )}
              </div>

              <ShotCounter total={totalShots} current={shotCount} />

              {/* pre-shoot settings */}
              {phase === "ready" && ready && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3"
                >
                  <LutPicker value={lut} onChange={(p) => { setLut(p); lutRef.current = p; }} />

                  <div className="flex items-center gap-4 text-[10px] tracking-wide text-[#8A8780]">
                    <label className="flex items-center gap-1.5">
                      {t("booth.countdown")}
                      <select
                        value={countdownSec}
                        onChange={(e) => setCountdownSec(Number(e.target.value))}
                        className="rounded-full border border-[#DDD9D0] bg-transparent px-2 py-1 text-[10px] text-[#2C2C2A] focus:outline-none"
                      >
                        <option value={3}>3s</option>
                        <option value={5}>5s</option>
                        <option value={10}>10s</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5">
                      shots
                      <select
                        value={totalShots}
                        onChange={(e) => setTotalShots(Number(e.target.value))}
                        className="rounded-full border border-[#DDD9D0] bg-transparent px-2 py-1 text-[10px] text-[#2C2C2A] focus:outline-none"
                      >
                        <option value={neededCount}>{neededCount}</option>
                        {neededCount < 6 && <option value={6}>6</option>}
                        <option value={8}>8</option>
                        <option value={10}>10</option>
                      </select>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* shutter button */}
              <div className="flex items-center gap-5">
                <button
                  onClick={flip}
                  disabled={phase !== "ready"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A]/60 transition-all duration-300 hover:border-[#D4A574] disabled:opacity-30 sm:h-10 sm:w-10"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={shoot}
                  disabled={!ready || phase !== "ready"}
                  className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 sm:h-16 sm:w-16"
                >
                  <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 group-hover:border-[#D4A574]/40" />
                  <Camera size={18} className="text-[#F5F2EA] sm:h-5 sm:w-5" />
                </button>
                <div className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>

              {phase === "ready" && ready && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[10px] tracking-wide text-[#8A8780]"
                >
                  {t("booth.tapToShoot")}
                </motion.p>
              )}
            </motion.div>
          )}

          {/* ---- REVIEW/SELECT PHASE ---- */}
          {phase === "reviewing" && photosRef.current.length > neededCount && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <p className="text-xs tracking-wide text-[#8A8780]">
                {t("booth.selectPhotos")} ({selectedIndices.length}/{neededCount})
              </p>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {photosRef.current.map((src, i) => {
                  const selIdx = selectedIndices.indexOf(i);
                  const isSelected = selIdx !== -1;
                  return (
                    <button
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={`relative aspect-[3/4] w-16 overflow-hidden rounded-md border-2 transition-all sm:w-20 ${
                        isSelected
                          ? "border-[#2C2C2A] shadow-sm"
                          : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    >
                      <Image src={src} alt={`shot ${i + 1}`} fill className="object-cover" unoptimized />
                      {isSelected && (
                        <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2C2C2A] text-[9px] font-medium text-white">
                          {selIdx + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={confirmSelection}
                disabled={selectedIndices.length !== neededCount}
                className="flex items-center gap-1.5 rounded-full bg-[#2C2C2A] px-6 py-2.5 text-xs tracking-wide text-[#F5F2EA] disabled:opacity-30"
              >
                <Check size={14} />
                {t("booth.confirmSelection")}
              </button>
            </motion.div>
          )}

          {/* ---- PROCESSING ---- */}
          {phase === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 size={20} className="animate-spin text-[#8A8780]" />
              <p className="text-xs tracking-wide text-[#8A8780]">{t("booth.compositing")}</p>
            </motion.div>
          )}

          {/* ---- RESULT ---- */}
          {phase === "done" && stripUrl && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-5"
            >
              <StripResult stripUrl={stripUrl} onRetake={retake} />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-2.5"
              >
                <LayoutPicker value={frameLayout} onChange={handleLayoutChange} />
                <LutPicker value={lut} onChange={handleLutChange} />
                <div onBlur={handleLabelBlur}>
                  <LabelInput value={customLabel} onChange={(v) => { setCustomLabel(v); labelRef.current = v; }} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
