"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useSegmentation } from "@/hooks/use-segmentation";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { applyMask } from "@/lib/mask";
import { generateGhostStrip } from "@/lib/ghost-composite";
import { LUT_CSS_FILTERS } from "@/lib/lut";
import type { LutPreset } from "@/lib/lut";
import type { Room } from "@/types/room";
import type { FrameLayout } from "@/lib/composite";
import {
  joinRoom,
  updateParticipant,
  uploadPhotos,
  subscribeToRoom,
} from "@/lib/rooms";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import GhostOverlay from "@/components/ghost-overlay";
import SegmentationPreview from "@/components/segmentation-preview";
import StripResult from "@/components/strip-result";
import ShareCard from "@/components/share-card";
import { getRoomUrl } from "@/lib/rooms";

const BETWEEN_SHOT_DELAY = 2000;
const SHOTS_PER_PERSON = 4;

type Phase =
  | "join"
  | "shooting"
  | "segmenting"
  | "preview"
  | "uploading"
  | "sharing"       // host waits for guest
  | "compositing"
  | "done";

interface GhostFlowProps {
  room: Room;
  sessionId: string;
}

export default function GhostFlow({ room, sessionId }: GhostFlowProps) {
  const { videoRef, ready, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(5);
  const seg = useSegmentation();
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("join");
  const [isHost, setIsHost] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [hostCutoutUrls, setHostCutoutUrls] = useState<string[]>([]);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const photosRef = useRef<string[]>([]);
  const cutoutsRef = useRef<string[]>([]);
  const lut = room.lut_preset as LutPreset;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // check if host cutouts exist (= we are person 2)
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // try to load host's first cutout
    const testUrl = `${supabaseUrl}/storage/v1/object/public/cutouts/${room.id}/host-cutout-0.png`;
    const img = new window.Image();
    img.onload = () => {
      // host cutouts exist — we are person 2
      const urls = Array.from({ length: SHOTS_PER_PERSON }, (_, i) =>
        `${supabaseUrl}/storage/v1/object/public/cutouts/${room.id}/host-cutout-${i}.png`,
      );
      setHostCutoutUrls(urls);
    };
    img.onerror = () => {
      // no host cutouts — we are person 1 (host)
      setIsHost(true);
    };
    img.src = testUrl;
  }, [room.id]);

  // host subscribes to room status to detect when guest finishes
  useEffect(() => {
    if (!isHost || phase !== "sharing") return;
    return subscribeToRoom(room.id, async (updated) => {
      if (updated.status === "complete") {
        // guest finished — load guest cutouts and composite
        setPhase("compositing");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const guestCutoutUrls = Array.from({ length: SHOTS_PER_PERSON }, (_, i) =>
          `${supabaseUrl}/storage/v1/object/public/cutouts/${room.id}/guest-cutout-${i}.png`,
        );
        try {
          const strip = await generateGhostStrip({
            person1Cutouts: cutoutsRef.current.length > 0
              ? cutoutsRef.current
              : Array.from({ length: SHOTS_PER_PERSON }, (_, i) =>
                  `${supabaseUrl}/storage/v1/object/public/cutouts/${room.id}/host-cutout-${i}.png`),
            person2Cutouts: guestCutoutUrls,
            backgroundId: room.background_id,
            layout: room.layout as FrameLayout,
            lut,
          });
          setStripUrl(strip);
          setPhase("done");
        } catch {
          setErrorMsg("compositing failed");
        }
      }
    });
  }, [isHost, phase, room]);

  const handleJoin = useCallback(async () => {
    try {
      const me = await joinRoom(room.id, sessionId, displayName || (isHost ? "host" : "guest"), isHost);
      setParticipantId(me.id);
      start("user");
      seg.init();
      setPhase("shooting");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "join failed");
    }
  }, [room.id, sessionId, displayName, isHost, start, seg]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready) return;

    photosRef.current = [];
    setShotCount(0);

    for (let i = 0; i < SHOTS_PER_PERSON; i++) {
      await runCountdown(5);
      setFlash(true);
      const frame = captureFrame(videoRef.current);
      photosRef.current.push(frame);
      setShotCount(i + 1);
      setLastCapture(frame);
      await sleep(100);
      setFlash(false);
      if (i < SHOTS_PER_PERSON - 1) {
        await sleep(BETWEEN_SHOT_DELAY);
        setLastCapture(null);
      }
    }

    stop();

    // segment all photos
    setPhase("segmenting");
    cutoutsRef.current = [];
    for (const photo of photosRef.current) {
      if (!seg.ready) {
        // fallback: use raw photo if segmentation not ready
        cutoutsRef.current.push(photo);
        continue;
      }
      try {
        // need to segment from an image element
        const img = new window.Image();
        img.src = photo;
        await new Promise((resolve) => { img.onload = resolve; });
        const mask = await seg.segment(img as HTMLImageElement);
        const cutout = await applyMask(photo, mask, 4);
        cutoutsRef.current.push(cutout);
      } catch {
        cutoutsRef.current.push(photo); // fallback
      }
    }

    setPhase("preview");
  }, [ready, videoRef, runCountdown, stop, seg]);

  const confirmCutouts = useCallback(async () => {
    if (!participantId) return;
    setPhase("uploading");

    try {
      const role = isHost ? "host-cutout" : "guest-cutout";
      await uploadPhotos(room.id, role, cutoutsRef.current);

      if (isHost) {
        // host waits for guest
        setPhase("sharing");
      } else {
        // guest: trigger composite
        const { updateRoom } = await import("@/lib/rooms");
        await updateRoom(room.id, { status: "complete" });

        setPhase("compositing");
        const strip = await generateGhostStrip({
          person1Cutouts: hostCutoutUrls,
          person2Cutouts: cutoutsRef.current,
          backgroundId: room.background_id,
          layout: room.layout as FrameLayout,
          lut,
        });
        setStripUrl(strip);
        setPhase("done");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "upload failed");
    }
  }, [participantId, isHost, room, hostCutoutUrls, lut]);

  const retake = useCallback(() => {
    photosRef.current = [];
    cutoutsRef.current = [];
    setShotCount(0);
    setLastCapture(null);
    start("user");
    setPhase("shooting");
  }, [start]);

  const roomUrl = getRoomUrl(room.short_code);

  return (
    <AnimatePresence mode="wait">
      {/* join */}
      {phase === "join" && (
        <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
          <h2 className="font-serif text-xl italic text-[#2C2C2A]">Duet</h2>
          <p className="text-xs text-[#8A8780]">
            {t("mode.ghost")} · {room.short_code}
          </p>
          <p className="text-[10px] text-[#D4A574]">
            {isHost ? "you are person 1" : "you are person 2 — ghost overlay enabled"}
          </p>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("join.enterName")}
            maxLength={20}
            className="w-48 rounded-full border border-[#2C2C2A]/[0.06] bg-[#FDFCF9] px-4 py-2.5 text-center text-xs text-[#2C2C2A] placeholder:text-[#DDD9D0] focus:border-[#D4A574]/30 focus:outline-none"
          />
          <button onClick={handleJoin} disabled={!displayName.trim()} className="rounded-full bg-[#2C2C2A] px-6 py-2.5 text-xs tracking-wide text-[#F5F2EA] disabled:opacity-30">
            {t("join.join")}
          </button>
          {seg.loading && <p className="text-[10px] text-[#8A8780]">{t("booth.loadingModel")}</p>}
          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
        </motion.div>
      )}

      {/* shooting */}
      {phase === "shooting" && (
        <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center gap-4">
          <div className="relative">
            <Viewfinder ref={videoRef} cssFilter={LUT_CSS_FILTERS[lut]} />
            <CountdownOverlay count={count} />
            <ShutterFlash flash={flash} />

            {/* ghost overlay for person 2 */}
            {!isHost && hostCutoutUrls.length > 0 && (
              <GhostOverlay cutouts={hostCutoutUrls} currentShot={shotCount} />
            )}

            {(!ready || seg.loading) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                <Loader2 size={20} className="animate-spin text-white/80" />
                <p className="text-[11px] text-white/60">
                  {seg.loading ? t("booth.loadingModel") : t("booth.startingCamera")}
                </p>
              </div>
            )}

            <AnimatePresence>
              {lastCapture && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute bottom-3 right-3 h-16 w-12 overflow-hidden rounded-md border-2 border-white/80 shadow-lg">
                  <Image src={lastCapture} alt="last" fill className="object-cover" unoptimized />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ShotCounter total={SHOTS_PER_PERSON} current={shotCount} />

          {!isHost && hostCutoutUrls.length > 0 && (
            <p className="text-[10px] text-[#8A8780]">{t("room.alignGhost")}</p>
          )}

          <div className="flex items-center gap-5">
            <button onClick={flip} disabled={shotCount > 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A]/60 disabled:opacity-30">
              <RefreshCw size={15} />
            </button>
            <button onClick={shoot} disabled={!ready || !seg.ready || shotCount > 0} className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all hover:scale-105 active:scale-95 disabled:opacity-30">
              <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 group-hover:border-[#D4A574]/40" />
              <Camera size={18} className="text-[#F5F2EA]" />
            </button>
            <div className="h-9 w-9" />
          </div>
        </motion.div>
      )}

      {/* segmenting */}
      {phase === "segmenting" && (
        <motion.div key="seg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="animate-spin text-[#8A8780]" />
          <p className="text-xs text-[#8A8780]">{t("ghost.segmenting")}</p>
        </motion.div>
      )}

      {/* preview cutouts */}
      {phase === "preview" && (
        <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SegmentationPreview
            originals={photosRef.current}
            cutouts={cutoutsRef.current}
            onConfirm={confirmCutouts}
            onRetake={retake}
          />
        </motion.div>
      )}

      {/* uploading / compositing */}
      {(phase === "uploading" || phase === "compositing") && (
        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="animate-spin text-[#8A8780]" />
          <p className="text-xs text-[#8A8780]">
            {phase === "uploading" ? t("room.uploading") : t("booth.compositing")}
          </p>
        </motion.div>
      )}

      {/* host waiting for guest */}
      {phase === "sharing" && (
        <motion.div key="sharing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
          <ShareCard url={roomUrl} code={room.short_code} />
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4A574]" />
            <p className="text-[10px] text-[#8A8780]">{t("create.waiting")}</p>
          </div>
        </motion.div>
      )}

      {/* done */}
      {phase === "done" && stripUrl && (
        <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5">
          <StripResult stripUrl={stripUrl} onRetake={retake} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
