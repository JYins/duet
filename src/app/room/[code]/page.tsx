"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useSegmentation } from "@/hooks/use-segmentation";
import { captureFrame } from "@/lib/camera";
import { applyMask } from "@/lib/mask";
import { generateStrip } from "@/lib/composite";
import {
  findRoom,
  uploadAllCutouts,
  updateRoom,
  subscribeToRoom,
} from "@/lib/rooms";
import type { Room } from "@/types/room";
import type { LutPreset } from "@/lib/lut";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import GhostOverlay from "@/components/ghost-overlay";
import StripResult from "@/components/strip-result";
import LutPicker from "@/components/lut-picker";

const TOTAL_SHOTS = 4;

type Phase = "loading" | "ready" | "shooting" | "uploading" | "compositing" | "done" | "error";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const { videoRef, ready, error: camError, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(3);
  const seg = useSegmentation();

  const [phase, setPhase] = useState<Phase>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [hostCutoutUrls, setHostCutoutUrls] = useState<string[]>([]);
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cutoutsRef = useRef<string[]>([]);

  // load room on mount
  useEffect(() => {
    async function load() {
      const found = await findRoom(params.code);
      if (!found) {
        setErrorMsg("room not found or expired");
        setPhase("error");
        return;
      }

      setRoom(found);
      setLut(found.lut_preset as LutPreset);

      // build host cutout urls from storage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const urls = Array.from({ length: TOTAL_SHOTS }, (_, i) =>
        `${supabaseUrl}/storage/v1/object/public/cutouts/${found.id}/host-${i}.png`,
      );
      setHostCutoutUrls(urls);

      setPhase("ready");
      start("user");
      seg.init();
    }
    load();
  }, [params.code, start, seg.init]);

  // subscribe to room updates
  useEffect(() => {
    if (!room) return;
    return subscribeToRoom(room.id, (updated) => {
      setRoom(updated);
    });
  }, [room?.id]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !seg.ready || !room) return;

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

    // upload guest cutouts
    setPhase("uploading");
    stop();

    try {
      await uploadAllCutouts(room.id, "guest", cutoutsRef.current);
      await updateRoom(room.id, { status: "complete" });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "upload failed");
      setPhase("error");
      return;
    }

    // composite: both people in each frame
    setPhase("compositing");

    try {
      const strip = await generateStrip({
        cutouts: cutoutsRef.current,
        partnerCutouts: hostCutoutUrls,
        lut,
        grain: true,
        vignette: true,
      });
      setStripUrl(strip);
      setPhase("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "compositing failed");
      setPhase("error");
    }
  }, [ready, seg.ready, room, videoRef, runCountdown, seg.segment, stop, lut]);

  const regrade = useCallback(
    async (preset: LutPreset) => {
      setLut(preset);
      if (phase !== "done" || cutoutsRef.current.length === 0) return;
      setPhase("compositing");
      const strip = await generateStrip({
        cutouts: cutoutsRef.current,
        partnerCutouts: hostCutoutUrls,
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

  // first host cutout for ghost overlay
  const ghostSrc = hostCutoutUrls.length > 0 ? hostCutoutUrls[0] : null;

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
        {room && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-mono text-[10px] tracking-wider text-[#D4A574] uppercase sm:text-xs"
          >
            {room.short_code}
          </motion.span>
        )}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        <AnimatePresence mode="wait">
          {/* loading */}
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 size={20} className="animate-spin text-[#8A8780]" />
              <p className="text-xs tracking-wide text-[#8A8780]">
                joining room...
              </p>
            </motion.div>
          )}

          {/* error */}
          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <p className="text-sm text-[#2C2C2A]">{errorMsg}</p>
              <a
                href="/"
                className="rounded-full border border-[#DDD9D0] px-5 py-2 text-xs text-[#2C2C2A] hover:bg-[#EDE9DF]"
              >
                back home
              </a>
            </motion.div>
          )}

          {/* camera + ghost */}
          {(phase === "ready" ||
            phase === "shooting" ||
            phase === "uploading" ||
            phase === "compositing") && (
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

                {/* ghost overlay — host's first cutout */}
                {ghostSrc && phase === "ready" && (
                  <GhostOverlay src={ghostSrc} />
                )}

                {modelLoading && phase === "ready" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-white/80" />
                    <p className="text-[11px] tracking-wide text-white/60">
                      {seg.loading ? "loading model..." : "starting camera..."}
                    </p>
                  </div>
                )}

                {(phase === "uploading" || phase === "compositing") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#F5F2EA]/80 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-[#2C2C2A]/60" />
                    <p className="text-[11px] tracking-wide text-[#2C2C2A]/50">
                      {phase === "uploading"
                        ? "uploading photos..."
                        : "compositing strip..."}
                    </p>
                  </div>
                )}

                {(camError || seg.error) && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/80 px-5">
                    <p className="text-center text-xs text-white/70">
                      {camError || seg.error}
                    </p>
                  </div>
                )}
              </div>

              <ShotCounter total={TOTAL_SHOTS} current={shotCount} />

              {/* hint about ghost */}
              {phase === "ready" && modelReady && ghostSrc && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="max-w-[240px] text-center text-[10px] leading-relaxed tracking-wide text-[#8A8780] sm:text-xs"
                >
                  align yourself with the ghost overlay, then tap to shoot
                </motion.p>
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
                  aria-label="take photos"
                >
                  <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 group-hover:border-[#D4A574]/40" />
                  <Camera size={18} className="text-[#F5F2EA] sm:h-5 sm:w-5" />
                </button>

                <div className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>
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
