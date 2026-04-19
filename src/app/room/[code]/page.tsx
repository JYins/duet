"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { generateStrip } from "@/lib/composite";
import {
  findRoom,
  uploadAllCutouts,
  updateRoom,
} from "@/lib/rooms";
import type { Room } from "@/types/room";
import type { LutPreset } from "@/lib/lut";
import { LUT_CSS_FILTERS } from "@/lib/lut";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import GhostOverlay from "@/components/ghost-overlay";
import StripResult from "@/components/strip-result";
import LutPicker from "@/components/lut-picker";

const TOTAL_SHOTS = 4;
const BETWEEN_SHOT_DELAY = 2000;

type Phase = "loading" | "ready" | "shooting" | "uploading" | "compositing" | "done" | "error";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const { videoRef, ready, error: camError, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(5);
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [hostPhotoUrls, setHostPhotoUrls] = useState<string[]>([]);
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  const photosRef = useRef<string[]>([]);
  const lutRef = useRef(lut); lutRef.current = lut;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // load room
  useEffect(() => {
    async function load() {
      const found = await findRoom(params.code);
      if (!found) {
        setErrorMsg(t("room.notFound"));
        setPhase("error");
        return;
      }
      setRoom(found);
      setLut(found.lut_preset as LutPreset);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const urls = Array.from({ length: TOTAL_SHOTS }, (_, i) =>
        `${supabaseUrl}/storage/v1/object/public/cutouts/${found.id}/host-${i}.png`,
      );
      setHostPhotoUrls(urls);
      setPhase("ready");
      start("user");
    }
    load();
  }, [params.code, start]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !room) return;

    setPhase("shooting");
    photosRef.current = [];
    setShotCount(0);

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      await runCountdown(5);
      setFlash(true);
      const frame = captureFrame(videoRef.current);
      photosRef.current.push(frame);
      setShotCount(i + 1);
      setLastCapture(frame);
      await sleep(100);
      setFlash(false);
      if (i < TOTAL_SHOTS - 1) {
        await sleep(BETWEEN_SHOT_DELAY);
        setLastCapture(null);
      }
    }

    setPhase("uploading");
    stop();

    try {
      await uploadAllCutouts(room.id, "guest", photosRef.current);
      await updateRoom(room.id, { status: "complete" });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "upload failed");
      setPhase("error");
      return;
    }

    // composite: interleave host + guest photos
    setPhase("compositing");
    try {
      const allPhotos: string[] = [];
      for (let i = 0; i < TOTAL_SHOTS; i++) {
        allPhotos.push(hostPhotoUrls[i]);
        allPhotos.push(photosRef.current[i]);
      }
      const strip = await generateStrip({
        photos: allPhotos.slice(0, 8),
        layout: "2x2",
        lut: lutRef.current,
      });
      setStripUrl(strip);
      setPhase("done");
    } catch {
      // fallback: just guest photos
      const strip = await generateStrip({
        photos: photosRef.current,
        lut: lutRef.current,
      });
      setStripUrl(strip);
      setPhase("done");
    }
  }, [ready, room, videoRef, runCountdown, stop, hostPhotoUrls]);

  const regrade = useCallback(
    async (preset: LutPreset) => {
      setLut(preset);
      lutRef.current = preset;
      if (phase !== "done" || photosRef.current.length === 0) return;
      setPhase("compositing");
      const strip = await generateStrip({
        photos: photosRef.current,
        lut: preset,
      });
      setStripUrl(strip);
      setPhase("done");
    },
    [phase],
  );

  const retake = useCallback(() => {
    photosRef.current = [];
    setShotCount(0);
    setStripUrl(null);
    setLastCapture(null);
    setPhase("ready");
    start("user");
  }, [start]);

  const ghostSrc = hostPhotoUrls.length > 0 ? hostPhotoUrls[0] : null;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[#F5F2EA]">
      <header className="flex w-full max-w-lg items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-3 sm:px-6 sm:pt-8">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-base italic text-[#2C2C2A]/40 sm:text-lg">
          Duet
        </motion.span>
        {room && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-[10px] tracking-wider text-[#D4A574] uppercase">
            {room.short_code}
          </motion.span>
        )}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <Loader2 size={20} className="animate-spin text-[#8A8780]" />
              <p className="text-xs tracking-wide text-[#8A8780]">{t("room.joining")}</p>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-[#2C2C2A]">{errorMsg}</p>
              <a href="/" className="rounded-full border border-[#DDD9D0] px-5 py-2 text-xs text-[#2C2C2A] hover:bg-[#EDE9DF]">
                {t("room.backHome")}
              </a>
            </motion.div>
          )}

          {(phase === "ready" || phase === "shooting" || phase === "uploading" || phase === "compositing") && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center gap-4 sm:gap-5">
              <div className="relative">
                <Viewfinder ref={videoRef} cssFilter={LUT_CSS_FILTERS[lut]} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />

                {ghostSrc && phase === "ready" && <GhostOverlay src={ghostSrc} />}

                {!ready && phase === "ready" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-white/80" />
                    <p className="text-[11px] text-white/60">{t("booth.startingCamera")}</p>
                  </div>
                )}

                {(phase === "uploading" || phase === "compositing") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#F5F2EA]/80 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-[#2C2C2A]/60" />
                    <p className="text-[11px] text-[#2C2C2A]/50">
                      {phase === "uploading" ? t("room.uploading") : t("room.compositing")}
                    </p>
                  </div>
                )}

                <AnimatePresence>
                  {lastCapture && phase === "shooting" && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute bottom-3 right-3 h-16 w-12 overflow-hidden rounded-md border-2 border-white/80 shadow-lg">
                      <Image src={lastCapture} alt="last" fill className="object-cover" unoptimized />
                    </motion.div>
                  )}
                </AnimatePresence>

                {camError && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-5">
                    <p className="text-center text-xs text-white/70">{camError}</p>
                  </div>
                )}
              </div>

              <ShotCounter total={TOTAL_SHOTS} current={shotCount} />

              {phase === "ready" && ready && ghostSrc && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[240px] text-center text-[10px] leading-relaxed text-[#8A8780]">
                  {t("room.alignGhost")}
                </motion.p>
              )}

              <div className="flex items-center gap-5">
                <button onClick={flip} disabled={phase !== "ready"} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A]/60 disabled:opacity-30 sm:h-10 sm:w-10">
                  <RefreshCw size={15} />
                </button>
                <button onClick={shoot} disabled={!ready || phase !== "ready"} className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all hover:scale-105 active:scale-95 disabled:opacity-30 sm:h-16 sm:w-16">
                  <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 group-hover:border-[#D4A574]/40" />
                  <Camera size={18} className="text-[#F5F2EA]" />
                </button>
                <div className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>
            </motion.div>
          )}

          {phase === "done" && stripUrl && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5">
              <StripResult stripUrl={stripUrl} onRetake={retake} />
              <LutPicker value={lut} onChange={regrade} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
