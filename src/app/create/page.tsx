"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, RefreshCw, Check } from "lucide-react";
import Image from "next/image";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { generateStrip, type FrameLayout } from "@/lib/composite";
import {
  createRoom,
  uploadAllCutouts,
  updateRoom,
  getRoomUrl,
  subscribeToRoom,
} from "@/lib/rooms";
import type { Room } from "@/types/room";
import type { LutPreset } from "@/lib/lut";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import LutPicker from "@/components/lut-picker";
import LayoutPicker from "@/components/layout-picker";
import LabelInput from "@/components/label-input";
import ShareCard from "@/components/share-card";
import StripResult from "@/components/strip-result";

const TOTAL_SHOTS = 4;
const BETWEEN_SHOT_DELAY = 2000;

type Phase = "ready" | "shooting" | "uploading" | "waiting" | "compositing" | "done";

export default function CreatePage() {
  const { videoRef, ready, error, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(5);
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("ready");
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [frameLayout, setFrameLayout] = useState<FrameLayout>("1x4");
  const [customLabel, setCustomLabel] = useState("");
  const [countdownSec, setCountdownSec] = useState(5);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const photosRef = useRef<string[]>([]);
  const lutRef = useRef(lut); lutRef.current = lut;
  const layoutRef = useRef(frameLayout); layoutRef.current = frameLayout;
  const labelRef = useRef(customLabel); labelRef.current = customLabel;

  useEffect(() => { start("user"); }, [start]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // subscribe to room — when guest completes, composite duet strip
  useEffect(() => {
    if (!room || phase !== "waiting") return;
    return subscribeToRoom(room.id, async (updated) => {
      if (updated.status === "complete") {
        setPhase("compositing");
        // fetch guest photos from storage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const guestPhotos = Array.from({ length: TOTAL_SHOTS }, (_, i) =>
          `${supabaseUrl}/storage/v1/object/public/cutouts/${room.id}/guest-${i}.png`,
        );
        // combine: interleave host and guest, or side by side
        const allPhotos = [];
        for (let i = 0; i < TOTAL_SHOTS; i++) {
          allPhotos.push(photosRef.current[i]);
          if (guestPhotos[i]) allPhotos.push(guestPhotos[i]);
        }
        try {
          const strip = await generateStrip({
            photos: allPhotos.slice(0, 8),
            layout: "2x2",
            lut: lutRef.current,
            label: labelRef.current || undefined,
          });
          setStripUrl(strip);
          setPhase("done");
        } catch {
          // fallback: just host photos
          const strip = await generateStrip({
            photos: photosRef.current,
            lut: lutRef.current,
            label: labelRef.current || undefined,
          });
          setStripUrl(strip);
          setPhase("done");
        }
      }
    });
  }, [room, phase]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready) return;

    setPhase("shooting");
    photosRef.current = [];
    setShotCount(0);

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      await runCountdown(countdownSec);
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

    // create room + upload
    setPhase("uploading");
    stop();

    try {
      const newRoom = await createRoom(lut);
      await uploadAllCutouts(newRoom.id, "host", photosRef.current);
      await updateRoom(newRoom.id, { status: "waiting" });
      setRoom(newRoom);
      setRoomCode(newRoom.short_code);
      setRoomUrl(getRoomUrl(newRoom.short_code));
      setPhase("waiting");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "upload failed");
      setPhase("ready");
      start("user");
    }
  }, [ready, videoRef, runCountdown, countdownSec, stop, lut, start]);

  const regrade = useCallback(
    async (preset: LutPreset) => {
      setLut(preset);
      lutRef.current = preset;
      if (phase !== "done" || photosRef.current.length === 0) return;
      setPhase("compositing");
      const strip = await generateStrip({
        photos: photosRef.current,
        layout: layoutRef.current,
        lut: preset,
        label: labelRef.current || undefined,
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
    setRoom(null);
    setRoomCode(null);
    setRoomUrl(null);
    setLastCapture(null);
    setPhase("ready");
    start("user");
  }, [start]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[#F5F2EA]">
      <header className="flex w-full max-w-lg items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-3 sm:px-6 sm:pt-8">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-base italic text-[#2C2C2A]/40 sm:text-lg">
          Duet
        </motion.span>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[10px] tracking-wider text-[#D4A574] uppercase sm:text-xs">
          {phase === "done" ? t("create.yourDuet") : t("create.title")}
        </motion.span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {/* camera */}
          {(phase === "ready" || phase === "shooting" || phase === "uploading") && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center gap-4 sm:gap-5">
              <div className="relative">
                <Viewfinder ref={videoRef} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />

                {!ready && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-white/80" />
                    <p className="text-[11px] tracking-wide text-white/60">{t("booth.startingCamera")}</p>
                  </div>
                )}

                {phase === "uploading" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#F5F2EA]/80 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-[#2C2C2A]/60" />
                    <p className="text-[11px] tracking-wide text-[#2C2C2A]/50">{t("create.creatingRoom")}</p>
                  </div>
                )}

                <AnimatePresence>
                  {lastCapture && phase === "shooting" && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute bottom-3 right-3 h-16 w-12 overflow-hidden rounded-md border-2 border-white/80 shadow-lg">
                      <Image src={lastCapture} alt="last" fill className="object-cover" unoptimized />
                    </motion.div>
                  )}
                </AnimatePresence>

                {(error || uploadError) && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-5">
                    <p className="text-center text-xs text-white/70">{error || uploadError}</p>
                  </div>
                )}
              </div>

              <ShotCounter total={TOTAL_SHOTS} current={shotCount} />

              {phase === "ready" && ready && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
                  <LutPicker value={lut} onChange={(p) => { setLut(p); lutRef.current = p; }} />
                  <div className="flex items-center gap-4 text-[10px] text-[#8A8780]">
                    <label className="flex items-center gap-1.5">
                      {t("booth.countdown")}
                      <select value={countdownSec} onChange={(e) => setCountdownSec(Number(e.target.value))} className="rounded-full border border-[#DDD9D0] bg-transparent px-2 py-1 text-[10px] text-[#2C2C2A] focus:outline-none">
                        <option value={3}>3s</option>
                        <option value={5}>5s</option>
                        <option value={10}>10s</option>
                      </select>
                    </label>
                  </div>
                </motion.div>
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

              {phase === "ready" && ready && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[10px] tracking-wide text-[#8A8780]">
                  {t("create.takeAndShare")}
                </motion.p>
              )}
            </motion.div>
          )}

          {/* waiting */}
          {(phase === "waiting" || phase === "compositing") && (
            <motion.div key="share" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
              {roomCode && roomUrl && <ShareCard url={roomUrl} code={roomCode} />}
              {phase === "waiting" && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4A574]" />
                  <p className="text-[10px] tracking-wide text-[#8A8780]">{t("create.waiting")}</p>
                </div>
              )}
              {phase === "compositing" && (
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#8A8780]" />
                  <p className="text-[10px] tracking-wide text-[#8A8780]">{t("create.friendJoined")}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* result */}
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
