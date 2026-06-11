"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid2X2, Loader2, RefreshCw, Sparkles, Timer, Wand2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { generateStrip, getLayout, type FrameLayout } from "@/lib/composite";
import type { LutPreset } from "@/lib/lut";
import { LUT_CSS_FILTERS } from "@/lib/lut";
import type { PaperStyleId } from "@/lib/paper-styles";
import {
  fitSelectionToCount,
  moveSelection,
  swapSelection as swapSelectionOrder,
  toggleSelection,
  uniqueSelection,
} from "@/lib/selection";
import type { CaptureShot } from "@/types/capture";
import BoothShell from "@/components/booth-shell";
import BottomControlDock from "@/components/bottom-control-dock";
import CaptureStage from "@/components/capture-stage";
import LabelInput from "@/components/label-input";
import LayoutPicker from "@/components/layout-picker";
import LutPicker from "@/components/lut-picker";
import PaperPicker from "@/components/paper-picker";
import ParticipantStatusRail from "@/components/participant-status-rail";
import PhotoStripPreview from "@/components/photo-strip-preview";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";

const DEFAULT_COUNTDOWN = 5;
const BETWEEN_SHOT_DELAY = 2000;

type Phase = "ready" | "shooting" | "reviewing" | "processing" | "done";

export default function BoothPage() {
  const { videoRef, ready, error, facing, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(DEFAULT_COUNTDOWN);
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("ready");
  const [shots, setShots] = useState<CaptureShot[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [shotCount, setShotCount] = useState(0);
  const [totalShots, setTotalShots] = useState(4);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("k-booth");
  const [frameLayout, setFrameLayout] = useState<FrameLayout>("1x4");
  const [paperStyle, setPaperStyle] = useState<PaperStyleId>("porcelain");
  const [customLabel, setCustomLabel] = useState("");
  const [countdownSec, setCountdownSec] = useState(DEFAULT_COUNTDOWN);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const neededCount = getLayout(frameLayout).count;
  const selectedUniqueIndices = useMemo(
    () => uniqueSelection(selectedIndices),
    [selectedIndices],
  );
  const selectedCount = selectedUniqueIndices.length;
  const selectedShots = useMemo(() => {
    const indices = selectedUniqueIndices.length > 0
      ? selectedUniqueIndices
      : shots.slice(0, neededCount).map((shot) => shot.index);
    return indices
      .slice(0, neededCount)
      .map((index) => shots.find((shot) => shot.index === index))
      .filter((shot): shot is CaptureShot => Boolean(shot));
  }, [neededCount, selectedUniqueIndices, shots]);

  useEffect(() => {
    start("user");
  }, [start]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const buildStrip = useCallback(async (overrides?: {
    lut?: LutPreset;
    paperStyle?: PaperStyleId;
    label?: string;
  }) => {
    const photos = selectedShots.map((shot) => shot.rawUrl);
    if (photos.length < neededCount) {
      throw new Error(t("error.selectPhotos"));
    }
    return generateStrip({
      photos: photos.slice(0, neededCount),
      layout: frameLayout,
      lut: overrides?.lut ?? lut,
      grain: true,
      vignette: true,
      label: (overrides?.label ?? customLabel) || undefined,
      paperStyle: overrides?.paperStyle ?? paperStyle,
    });
  }, [customLabel, frameLayout, lut, neededCount, paperStyle, selectedShots, t]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || phase !== "ready") return;

    setPhase("shooting");
    setShots([]);
    setSelectedIndices([]);
    setErrorMsg(null);
    setShotCount(0);
    setStripUrl(null);
    setLastCapture(null);

    const captured: CaptureShot[] = [];
    for (let i = 0; i < totalShots; i++) {
      await runCountdown(countdownSec);

      setFlash(true);
      const { raw, filtered } = captureFrame(videoRef.current, {
        cssFilter: LUT_CSS_FILTERS[lut],
        mirrored: facing === "user",
      });
      const shot = { index: i, rawUrl: raw, filteredUrl: filtered, selected: i < neededCount };
      captured.push(shot);
      setShots([...captured]);
      setShotCount(i + 1);
      setLastCapture(filtered);

      await sleep(100);
      setFlash(false);

      if (i < totalShots - 1) {
        await sleep(BETWEEN_SHOT_DELAY);
        setLastCapture(null);
      }
    }

    stop();
    setSelectedIndices(captured.slice(0, neededCount).map((shot) => shot.index));
    setPhase("reviewing");
  }, [countdownSec, facing, lut, neededCount, phase, ready, runCountdown, stop, totalShots, videoRef]);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIndices((prev) => toggleSelection(prev, idx, neededCount));
  }, [neededCount]);

  const reorderSelection = useCallback((from: number, to: number) => {
    setSelectedIndices((prev) => moveSelection(prev, from, to));
  }, []);

  const swapSelection = useCallback((a: number, b: number) => {
    setSelectedIndices((prev) => swapSelectionOrder(prev, a, b));
  }, []);

  const confirmSelection = useCallback(async () => {
    if (selectedCount !== neededCount || selectedShots.length < neededCount) return;
    setPhase("processing");
    setErrorMsg(null);
    try {
      const strip = await buildStrip();
      setStripUrl(strip);
      setPhase("done");
    } catch {
      setErrorMsg(t("error.composite"));
      setPhase("reviewing");
    }
  }, [buildStrip, neededCount, selectedCount, selectedShots.length, t]);

  const regenerate = useCallback(async (overrides?: {
    lut?: LutPreset;
    paperStyle?: PaperStyleId;
    label?: string;
  }) => {
    if (phase !== "done" || selectedCount !== neededCount || selectedShots.length < neededCount) return;
    setPhase("processing");
    setErrorMsg(null);
    try {
      const strip = await buildStrip(overrides);
      setStripUrl(strip);
      setPhase("done");
    } catch {
      setErrorMsg(t("error.refreshStrip"));
      setPhase("done");
    }
  }, [buildStrip, neededCount, phase, selectedCount, selectedShots.length, t]);

  const retake = useCallback(() => {
    setShots([]);
    setShotCount(0);
    setStripUrl(null);
    setLastCapture(null);
    setErrorMsg(null);
    setSelectedIndices([]);
    setPhase("ready");
    start("user");
  }, [start]);

  const handleLayoutChange = useCallback((layout: FrameLayout) => {
    setFrameLayout(layout);
    const nextNeeded = getLayout(layout).count;
    setTotalShots((current) => Math.max(current, nextNeeded));
    setSelectedIndices((prev) => {
      return fitSelectionToCount(prev, shots.map((shot) => shot.index), nextNeeded);
    });
  }, [shots]);

  const tunePaper = useCallback((nextStyle: PaperStyleId) => {
    setPaperStyle(nextStyle);
    void regenerate({ paperStyle: nextStyle });
  }, [regenerate]);

  const tuneLut = useCallback((nextLut: LutPreset) => {
    setLut(nextLut);
    void regenerate({ lut: nextLut });
  }, [regenerate]);

  const step = phase === "done" ? "STEP 4 / 4" : phase === "reviewing" ? "STEP 3 / 4" : "STEP 2 / 4";

  return (
    <BoothShell step={step}>
      <ParticipantStatusRail
        leftLabel={t("booth.you")}
        rightLabel={t("booth.solo")}
        centerLabel={t("shell.privateBooth")}
        centerSubtext={phase === "ready" ? t("booth.readyToCapture") : `${shotCount}/${totalShots} ${t("booth.captured")}`}
      />
      {errorMsg && (
        <div className="rounded-2xl border border-[#C45B4A]/20 bg-[#FFF7F4] px-4 py-3 text-center text-xs text-[#A44B3D]">
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {(phase === "ready" || phase === "shooting") && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-1 flex-col gap-3"
          >
            <CaptureStage
              ref={videoRef}
              ready={ready}
              error={error}
              mirrored={facing === "user"}
              cssFilter={LUT_CSS_FILTERS[lut]}
              count={count}
              flash={flash}
              hint={phase === "ready" ? t("booth.tapToShoot") : undefined}
              lastCapture={
                lastCapture ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute bottom-4 right-4 z-10 h-20 w-15 overflow-hidden rounded-xl border-2 border-white/85 shadow-lg"
                  >
                    <Image src={lastCapture} alt={t("booth.lastCapture")} fill className="object-cover" unoptimized />
                  </motion.div>
                ) : null
              }
            />
            <ShotCounter total={totalShots} current={shotCount} />
            {phase === "ready" && (
              <div className="space-y-2 rounded-[1.25rem] border border-[#2C2C2A]/10 bg-[#FDFCF9]/60 p-3">
                <LutPicker value={lut} onChange={setLut} />
                <div className="flex items-center justify-center gap-4 text-[11px] text-[#6F6A61]">
                  <label className="flex items-center gap-2">
                    {t("booth.countdown")}
                    <select
                      value={countdownSec}
                      onChange={(event) => setCountdownSec(Number(event.target.value))}
                      className="rounded-full border border-[#DDD9D0] bg-[#FDFCF9] px-3 py-1.5 text-[11px] text-[#2C2C2A]"
                    >
                      <option value={3}>3s</option>
                      <option value={5}>5s</option>
                      <option value={10}>10s</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    {t("booth.shots")}
                    <select
                      value={totalShots}
                      onChange={(event) => setTotalShots(Number(event.target.value))}
                      className="rounded-full border border-[#DDD9D0] bg-[#FDFCF9] px-3 py-1.5 text-[11px] text-[#2C2C2A]"
                    >
                      <option value={neededCount}>{neededCount}</option>
                      <option value={Math.max(neededCount + 2, 6)}>{Math.max(neededCount + 2, 6)}</option>
                      <option value={10}>10</option>
                    </select>
                  </label>
                </div>
              </div>
            )}
            <BottomControlDock
              onShutter={shoot}
              shutterDisabled={!ready || phase !== "ready"}
              tools={[
                { id: "layout", label: t("booth.toolLayout"), value: frameLayout, icon: <Grid2X2 size={22} strokeWidth={1.5} /> },
                { id: "ghost", label: t("booth.toolGhost"), value: t("booth.toolOff"), icon: <Wand2 size={22} strokeWidth={1.5} /> },
                { id: "filter", label: t("booth.toolFilter"), value: lut === "k-booth" ? "seoul" : lut, icon: <Sparkles size={22} strokeWidth={1.5} />, active: true },
                { id: "flip", label: t("booth.toolFlip"), value: t("booth.toolLens"), icon: <RefreshCw size={22} strokeWidth={1.5} />, onClick: flip, disabled: phase !== "ready" },
              ]}
            />
          </motion.div>
        )}

        {phase === "reviewing" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <div className="text-center">
              <p className="font-serif text-2xl italic text-[#2C2C2A]">{t("booth.selectPhotos")}</p>
              <p className="mt-1 text-xs text-[#8A8780]">
                {selectedCount}/{neededCount}
              </p>
            </div>
            <PhotoStripPreview
              shots={shots}
              selectedIndices={selectedIndices}
              onToggle={toggleSelect}
              onReorder={reorderSelection}
              onSwap={swapSelection}
              neededCount={neededCount}
              slotStart={0}
              layout={frameLayout}
              showOrderTray={false}
            />
            <div className="space-y-3">
              <LayoutPicker
                value={frameLayout}
                onChange={handleLayoutChange}
                options={["1x4", "2x2", "1x3", "2x3", "2x4", "3x3"].filter((layout) => (
                  getLayout(layout as FrameLayout).count <= shots.length
                )) as FrameLayout[]}
              />
              <button
                type="button"
                onClick={confirmSelection}
                disabled={selectedCount !== neededCount}
                className="w-full rounded-full bg-[#2C2C2A] px-7 py-3 text-[13px] font-medium text-[#F5F2EA] disabled:opacity-30"
              >
                {t("booth.confirmSelection")}
              </button>
            </div>
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-3"
          >
            <Loader2 size={22} className="animate-spin text-[#8A8780]" />
            <p className="text-xs tracking-wide text-[#8A8780]">{t("booth.compositing")}</p>
          </motion.div>
        )}

        {phase === "done" && stripUrl && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <StripResult stripUrl={stripUrl} onRetake={retake} />
            <div className="w-full space-y-3 rounded-[1.25rem] border border-[#2C2C2A]/10 bg-[#FDFCF9]/60 p-4">
              <PaperPicker value={paperStyle} onChange={tunePaper} />
              <LutPicker value={lut} onChange={tuneLut} />
              <div onBlur={() => void regenerate()}>
                <LabelInput value={customLabel} onChange={setCustomLabel} />
              </div>
              <button
                type="button"
                onClick={() => void regenerate()}
                className="mx-auto flex items-center gap-2 rounded-full border border-[#D4A574]/30 px-5 py-2 text-[12px] text-[#A97841]"
              >
                <Timer size={14} strokeWidth={1.5} />
                {t("booth.refreshStrip")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BoothShell>
  );
}
