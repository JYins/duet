"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useSegmentation } from "@/hooks/use-segmentation";
import { captureFrame } from "@/lib/camera";
import { applyMask } from "@/lib/mask";
import { generateStrip } from "@/lib/composite";
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
import ShareCard from "@/components/share-card";
import StripResult from "@/components/strip-result";

const TOTAL_SHOTS = 4;

type Phase = "ready" | "shooting" | "uploading" | "waiting" | "compositing" | "done";

export default function CreatePage() {
  const { videoRef, ready, error, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(3);
  const seg = useSegmentation();

  const [phase, setPhase] = useState<Phase>("ready");
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [room, setRoom] = useState<Room | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const cutoutsRef = useRef<string[]>([]);

  useEffect(() => {
    start("user");
    seg.init();
  }, [start, seg.init]);

  // subscribe to room — when guest completes, auto-composite the duet strip
  useEffect(() => {
    if (!room || phase !== "waiting") return;

    return subscribeToRoom(room.id, async (updated) => {
      if (updated.status === "complete") {
        setPhase("compositing");

        // build guest cutout urls
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const guestUrls = Array.from({ length: TOTAL_SHOTS }, (_, i) =>
          `${supabaseUrl}/storage/v1/object/public/cutouts/${room.id}/guest-${i}.png`,
        );

        try {
          const strip = await generateStrip({
            cutouts: cutoutsRef.current,
            partnerCutouts: guestUrls,
            lut,
            grain: true,
            vignette: true,
          });
          setStripUrl(strip);
          setPhase("done");
        } catch (e) {
          console.error("[duet] compositing failed on host side", e);
          // fallback: just show host's own strip
          const strip = await generateStrip({
            cutouts: cutoutsRef.current,
            lut,
            grain: true,
            vignette: true,
          });
          setStripUrl(strip);
          setPhase("done");
        }
      }
    });
  }, [room, phase, lut]);

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

    setPhase("uploading");
    stop();

    try {
      const newRoom = await createRoom(lut);
      await uploadAllCutouts(newRoom.id, "host", cutoutsRef.current);
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
  }, [ready, seg.ready, videoRef, runCountdown, seg.segment, stop, lut, start]);

  const regrade = useCallback(
    async (preset: LutPreset) => {
      setLut(preset);
      if (phase !== "done" || cutoutsRef.current.length === 0) return;

      setPhase("compositing");

      const guestUrls = room
        ? Array.from({ length: TOTAL_SHOTS }, (_, i) =>
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cutouts/${room.id}/guest-${i}.png`,
          )
        : undefined;

      const strip = await generateStrip({
        cutouts: cutoutsRef.current,
        partnerCutouts: guestUrls,
        lut: preset,
        grain: true,
        vignette: true,
      });
      setStripUrl(strip);
      setPhase("done");
    },
    [phase, room],
  );

  const retake = useCallback(() => {
    cutoutsRef.current = [];
    setShotCount(0);
    setStripUrl(null);
    setRoom(null);
    setRoomCode(null);
    setRoomUrl(null);
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
          duet
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[10px] tracking-wider text-[#D4A574] uppercase sm:text-xs"
        >
          {phase === "done" ? "your duet" : "create room"}
        </motion.span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {/* camera phase */}
          {(phase === "ready" || phase === "shooting" || phase === "uploading") && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-5 sm:gap-6"
            >
              <div className="relative">
                <Viewfinder ref={videoRef} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />

                {modelLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-white/80" />
                    <p className="text-[11px] tracking-wide text-white/60 sm:text-xs">
                      {seg.loading ? "loading model..." : "starting camera..."}
                    </p>
                  </div>
                )}

                {phase === "uploading" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#F5F2EA]/80 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-[#2C2C2A]/60" />
                    <p className="text-[11px] tracking-wide text-[#2C2C2A]/50 sm:text-xs">
                      creating room...
                    </p>
                  </div>
                )}

                {(error || seg.error || uploadError) && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-5">
                    <p className="text-center text-xs leading-relaxed text-white/70">
                      {error || seg.error || uploadError}
                    </p>
                  </div>
                )}
              </div>

              <ShotCounter total={TOTAL_SHOTS} current={shotCount} />

              {phase === "ready" && modelReady && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <LutPicker value={lut} onChange={setLut} />
                </motion.div>
              )}

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
                  aria-label="take photos and create room"
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
                  transition={{ delay: 0.6 }}
                  className="text-[10px] tracking-wide text-[#8A8780] sm:text-xs"
                >
                  take your photos, then share the room
                </motion.p>
              )}
            </motion.div>
          )}

          {/* waiting for guest */}
          {(phase === "waiting" || phase === "compositing") && (
            <motion.div
              key="share"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              {roomCode && roomUrl && (
                <ShareCard url={roomUrl} code={roomCode} />
              )}

              {phase === "waiting" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2"
                >
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4A574]" />
                  <p className="text-[10px] tracking-wide text-[#8A8780] sm:text-xs">
                    waiting for your friend...
                  </p>
                </motion.div>
              )}

              {phase === "compositing" && (
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#8A8780]" />
                  <p className="text-[10px] tracking-wide text-[#8A8780] sm:text-xs">
                    your friend joined! compositing...
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* result */}
          {phase === "done" && stripUrl && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              <StripResult stripUrl={stripUrl} onRetake={retake} />
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LutPicker value={lut} onChange={regrade} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
