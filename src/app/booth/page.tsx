"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCw, Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useSegmentation } from "@/hooks/use-segmentation";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { applyMask } from "@/lib/mask";
import { applyDepthBlur } from "@/lib/blur";
import { generateStrip, type FrameLayout } from "@/lib/composite";
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
import PhotoSelector from "@/components/photo-selector";
import LayoutPicker from "@/components/layout-picker";
import LabelInput from "@/components/label-input";

const MAX_SHOTS = 10;
const PICK_COUNT = 4;
const DEFAULT_COUNTDOWN = 5;

type Phase = "ready" | "shooting" | "selecting" | "processing" | "done";

interface CapturedFrame {
  raw: string;
  mask: ImageData;
  cutout: string;
}

export default function BoothPage() {
  const { videoRef, ready, error, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(DEFAULT_COUNTDOWN);
  const seg = useSegmentation();
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("ready");
  const [shotCount, setShotCount] = useState(0);
  const [totalShots, setTotalShots] = useState(MAX_SHOTS);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [bgId, setBgId] = useState("cream");
  const [bgUrl, setBgUrl] = useState<string | undefined>(undefined);
  const [bgColor, setBgColor] = useState("#EDE9DF");
  const [depth, setDepth] = useState(0);
  const [countdownSec, setCountdownSec] = useState(DEFAULT_COUNTDOWN);
  const [frameLayout, setFrameLayout] = useState<FrameLayout>("1x4");
  const [customLabel, setCustomLabel] = useState("");
  const [stripUrl, setStripUrl] = useState<string | null>(null);

  // all captured frames (up to MAX_SHOTS)
  const allFramesRef = useRef<CapturedFrame[]>([]);
  // the 4 selected frames for the final strip
  const selectedRef = useRef<CapturedFrame[]>([]);

  useEffect(() => {
    start("user");
    seg.init();
  }, [start, seg.init]);

  const layoutRef = useRef(frameLayout);
  layoutRef.current = frameLayout;
  const labelRef = useRef(customLabel);
  labelRef.current = customLabel;

  const composite = useCallback(
    async (
      frames: CapturedFrame[],
      opts: { lut: LutPreset; bgUrl?: string; bgColor: string; depth: number },
    ) => {
      let cutouts = frames.map((f) => f.cutout);
      if (opts.depth > 0) {
        cutouts = await Promise.all(
          frames.map((f) => applyDepthBlur(f.raw, f.mask, opts.depth)),
        );
      }
      return generateStrip({
        cutouts,
        background: opts.bgUrl,
        bgColor: opts.bgColor,
        layout: layoutRef.current,
        lut: opts.lut,
        grain: true,
        vignette: true,
        label: labelRef.current || undefined,
      });
    },
    [],
  );

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !seg.ready) return;

    setPhase("shooting");
    allFramesRef.current = [];
    setShotCount(0);

    for (let i = 0; i < totalShots; i++) {
      await runCountdown(countdownSec);
      setFlash(true);
      setTimeout(() => setFlash(false), 50);

      const raw = captureFrame(videoRef.current);
      const mask = await seg.segment(videoRef.current);
      const cutout = await applyMask(raw, mask);
      allFramesRef.current.push({ raw, mask, cutout });
      setShotCount(i + 1);
    }

    stop();

    // if exactly 4 shots, skip selection
    if (totalShots <= PICK_COUNT) {
      selectedRef.current = allFramesRef.current;
      setPhase("processing");
      const strip = await composite(selectedRef.current, {
        lut, bgUrl, bgColor, depth,
      });
      setStripUrl(strip);
      setPhase("done");
    } else {
      setPhase("selecting");
    }
  }, [ready, seg.ready, videoRef, runCountdown, seg.segment, stop, totalShots, countdownSec, lut, bgUrl, bgColor, depth, composite]);

  // user confirmed their 4 picks
  const onSelectionConfirm = useCallback(
    async (selectedCutouts: string[]) => {
      // find matching frames
      selectedRef.current = selectedCutouts.map((cutout) => {
        return allFramesRef.current.find((f) => f.cutout === cutout)!;
      });

      setPhase("processing");
      const strip = await composite(selectedRef.current, {
        lut, bgUrl, bgColor, depth,
      });
      setStripUrl(strip);
      setPhase("done");
    },
    [lut, bgUrl, bgColor, depth, composite],
  );

  // use refs for current settings so regenerate always reads latest
  const lutRef = useRef(lut);
  lutRef.current = lut;
  const bgUrlRef = useRef(bgUrl);
  bgUrlRef.current = bgUrl;
  const bgColorRef = useRef(bgColor);
  bgColorRef.current = bgColor;
  const depthRef = useRef(depth);
  depthRef.current = depth;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const regenerate = useCallback(async () => {
    if (selectedRef.current.length === 0) return;
    setPhase("processing");
    const strip = await composite(selectedRef.current, {
      lut: lutRef.current,
      bgUrl: bgUrlRef.current,
      bgColor: bgColorRef.current,
      depth: depthRef.current,
    });
    setStripUrl(strip);
    setPhase("done");
  }, [composite]);

  const handleLutChange = useCallback(
    (preset: LutPreset) => {
      setLut(preset);
      // schedule regenerate after state updates
      if (phaseRef.current === "done") {
        lutRef.current = preset;
        regenerate();
      }
    },
    [regenerate],
  );

  const handleBgChange = useCallback(
    (bg: Background) => {
      setBgId(bg.id);
      setBgUrl(bg.url ?? undefined);
      setBgColor(bg.color);
      if (phaseRef.current === "done") {
        bgUrlRef.current = bg.url ?? undefined;
        bgColorRef.current = bg.color;
        regenerate();
      }
    },
    [regenerate],
  );

  const handleDepthChange = useCallback((v: number) => setDepth(v), []);
  const handleDepthCommit = useCallback(() => {
    depthRef.current = depth;
    if (phaseRef.current === "done") regenerate();
  }, [depth, regenerate]);

  const handleLayoutChange = useCallback(
    (l: FrameLayout) => {
      setFrameLayout(l);
      layoutRef.current = l;
      if (phaseRef.current === "done") regenerate();
    },
    [regenerate],
  );

  const handleLabelChange = useCallback((v: string) => {
    setCustomLabel(v);
    labelRef.current = v;
  }, []);

  const handleLabelBlur = useCallback(() => {
    if (phaseRef.current === "done") regenerate();
  }, [regenerate]);

  const retake = useCallback(() => {
    allFramesRef.current = [];
    selectedRef.current = [];
    setShotCount(0);
    setStripUrl(null);
    setPhase("ready");
    start("user");
  }, [start]);

  const modelReady = seg.ready && ready;
  const modelLoading = seg.loading || !ready;

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
        {seg.runtime && phase !== "done" && phase !== "selecting" && (
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

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {/* shooting phase */}
          {(phase === "ready" || phase === "shooting" || phase === "processing") && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 sm:gap-5"
            >
              <div className="relative">
                <Viewfinder ref={videoRef} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />

                {modelLoading && phase === "ready" && (
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
                    <p className="text-center text-xs text-white/70">{error || seg.error}</p>
                  </div>
                )}
              </div>

              <ShotCounter
                total={phase === "shooting" ? totalShots : PICK_COUNT}
                current={shotCount}
              />

              {/* pre-shoot settings */}
              {phase === "ready" && modelReady && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-3"
                >
                  <BgPicker value={bgId} onChange={handleBgChange} />
                  <LutPicker value={lut} onChange={handleLutChange} />

                  {/* countdown + shots config */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] tracking-wide text-[#8A8780] uppercase">
                        {t("booth.countdown")}
                      </span>
                      <select
                        value={countdownSec}
                        onChange={(e) => setCountdownSec(Number(e.target.value))}
                        className="rounded-full border border-[#DDD9D0] bg-transparent px-2 py-1 text-[10px] text-[#2C2C2A] focus:outline-none"
                      >
                        <option value={3}>3s</option>
                        <option value={5}>5s</option>
                        <option value={10}>10s</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] tracking-wide text-[#8A8780] uppercase">
                        shots
                      </span>
                      <select
                        value={totalShots}
                        onChange={(e) => setTotalShots(Number(e.target.value))}
                        className="rounded-full border border-[#DDD9D0] bg-transparent px-2 py-1 text-[10px] text-[#2C2C2A] focus:outline-none"
                      >
                        <option value={4}>4</option>
                        <option value={6}>6</option>
                        <option value={8}>8</option>
                        <option value={10}>10</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* controls */}
              <div className="flex items-center gap-5">
                <button
                  onClick={flip}
                  disabled={phase !== "ready"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A]/60 transition-all duration-300 hover:border-[#D4A574] disabled:opacity-30 sm:h-10 sm:w-10"
                  aria-label="flip camera"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={shoot}
                  disabled={!modelReady || phase !== "ready"}
                  className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 sm:h-16 sm:w-16"
                  aria-label="take photos"
                >
                  <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 group-hover:border-[#D4A574]/40" />
                  <Camera size={18} className="text-[#F5F2EA] sm:h-5 sm:w-5" />
                </button>
                <div className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>

              {phase === "ready" && modelReady && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-[10px] tracking-wide text-[#8A8780] sm:text-xs"
                >
                  {t("booth.tapToShoot")}
                </motion.p>
              )}
            </motion.div>
          )}

          {/* selection phase */}
          {phase === "selecting" && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PhotoSelector
                photos={allFramesRef.current.map((f) => f.cutout)}
                maxSelect={PICK_COUNT}
                onConfirm={onSelectionConfirm}
              />
            </motion.div>
          )}

          {/* result phase */}
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
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-3"
              >
                <LayoutPicker value={frameLayout} onChange={handleLayoutChange} />
                <BgPicker value={bgId} onChange={handleBgChange} />
                <LutPicker value={lut} onChange={handleLutChange} />
                <div onPointerUp={handleDepthCommit} onTouchEnd={handleDepthCommit}>
                  <DepthSlider value={depth} onChange={handleDepthChange} />
                </div>
                <div onBlur={handleLabelBlur}>
                  <LabelInput value={customLabel} onChange={handleLabelChange} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
