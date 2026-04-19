"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { generateStrip } from "@/lib/composite";
import { LUT_CSS_FILTERS } from "@/lib/lut";
import type { LutPreset } from "@/lib/lut";
import type { Room, RoomParticipant } from "@/types/room";
import type { FrameLayout } from "@/lib/composite";
import {
  joinRoom,
  updateParticipant,
  uploadPhotos,
  subscribeToParticipants,
  getParticipants,
} from "@/lib/rooms";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";
import LutPicker from "@/components/lut-picker";
import WaitingRoom from "@/components/waiting-room";
import { getRoomUrl } from "@/lib/rooms";

const BETWEEN_SHOT_DELAY = 2000;

type Phase = "join" | "waiting" | "shooting" | "selecting" | "uploading" | "submitted" | "compositing" | "done";

interface AsyncFlowProps {
  room: Room;
  sessionId: string;
}

export default function AsyncFlow({ room, sessionId }: AsyncFlowProps) {
  const { videoRef, ready, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(5);
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("join");
  const [displayName, setDisplayName] = useState("");
  const [myParticipant, setMyParticipant] = useState<RoomParticipant | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(5);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const photosRef = useRef<string[]>([]);
  const lut = room.lut_preset as LutPreset;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // subscribe to participants
  useEffect(() => {
    if (phase === "join") return;
    getParticipants(room.id).then(setParticipants);
    return subscribeToParticipants(room.id, (ps) => {
      setParticipants(ps);
      const allDone = ps.filter((p) => p.status === "submitted").length >= room.participant_count;
      if (allDone && (phase === "submitted" || phase === "waiting")) {
        compositeAll(ps);
      }
    });
  }, [room.id, phase]);

  // join
  const handleJoin = useCallback(async () => {
    try {
      const me = await joinRoom(room.id, sessionId, displayName || "guest");
      setMyParticipant(me);
      setPhase("waiting");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "failed to join");
    }
  }, [room.id, sessionId, displayName]);

  // start shooting
  const startShooting = useCallback(async () => {
    if (!myParticipant) return;
    start("user");
    await updateParticipant(myParticipant.id, { status: "shooting" });
    setPhase("shooting");
  }, [myParticipant, start]);

  // shoot
  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !myParticipant) return;
    const needed = myParticipant.slot_count;
    const total = Math.max(needed, needed + 2);

    photosRef.current = [];
    setShotCount(0);

    for (let i = 0; i < total; i++) {
      await runCountdown(countdownSec);
      setFlash(true);
      const frame = captureFrame(videoRef.current);
      photosRef.current.push(frame);
      setShotCount(i + 1);
      setLastCapture(frame);
      await sleep(100);
      setFlash(false);
      if (i < total - 1) { await sleep(BETWEEN_SHOT_DELAY); setLastCapture(null); }
    }
    stop();

    if (total <= needed) {
      await submitPhotos(photosRef.current.slice(0, needed));
    } else {
      setPhase("selecting");
    }
  }, [ready, videoRef, runCountdown, countdownSec, stop, myParticipant]);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      const needed = myParticipant?.slot_count || 2;
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= needed) return prev;
      return [...prev, idx];
    });
  }, [myParticipant]);

  const confirmSelection = useCallback(async () => {
    await submitPhotos(selectedIndices.map((i) => photosRef.current[i]));
  }, [selectedIndices]);

  const submitPhotos = useCallback(async (photos: string[]) => {
    if (!myParticipant) return;
    setPhase("uploading");
    try {
      const urls = await uploadPhotos(room.id, myParticipant.id, photos);
      await updateParticipant(myParticipant.id, { status: "submitted", photo_paths: urls });
      setPhase("submitted");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "upload failed");
    }
  }, [room.id, myParticipant]);

  const compositeAll = useCallback(async (ps: RoomParticipant[]) => {
    setPhase("compositing");
    const sorted = [...ps].sort((a, b) => a.slot_start - b.slot_start);
    const allPhotos = sorted.flatMap((p) => p.photo_paths);
    try {
      const strip = await generateStrip({
        photos: allPhotos,
        layout: room.layout as FrameLayout,
        lut,
      });
      setStripUrl(strip);
      setPhase("done");
    } catch {
      setErrorMsg("compositing failed");
    }
  }, [room.layout, lut]);

  const roomUrl = getRoomUrl(room.short_code);

  return (
    <AnimatePresence mode="wait">
      {/* join screen */}
      {phase === "join" && (
        <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
          <h2 className="font-serif text-xl italic text-[#2C2C2A]">Duet</h2>
          <p className="text-xs text-[#8A8780]">{room.short_code} · {room.participant_count} {t("config.participants")}</p>
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
          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
        </motion.div>
      )}

      {/* waiting room */}
      {(phase === "waiting" || phase === "submitted") && (
        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <WaitingRoom
            roomUrl={roomUrl}
            roomCode={room.short_code}
            participants={participants}
            expectedCount={room.participant_count}
            currentUserId={sessionId}
            onStartShooting={phase === "waiting" && myParticipant?.status === "joined" ? startShooting : undefined}
          />
        </motion.div>
      )}

      {/* shooting */}
      {phase === "shooting" && (
        <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center gap-4">
          <div className="relative">
            <Viewfinder ref={videoRef} cssFilter={LUT_CSS_FILTERS[lut]} />
            <CountdownOverlay count={count} />
            <ShutterFlash flash={flash} />
            <AnimatePresence>
              {lastCapture && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute bottom-3 right-3 h-16 w-12 overflow-hidden rounded-md border-2 border-white/80 shadow-lg">
                  <Image src={lastCapture} alt="last" fill className="object-cover" unoptimized />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ShotCounter total={myParticipant ? myParticipant.slot_count + 2 : 4} current={shotCount} />
          <div className="flex items-center gap-5">
            <button onClick={flip} disabled={shotCount > 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A]/60 disabled:opacity-30">
              <RefreshCw size={15} />
            </button>
            <button onClick={shoot} disabled={!ready || shotCount > 0} className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all hover:scale-105 active:scale-95 disabled:opacity-30">
              <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 group-hover:border-[#D4A574]/40" />
              <Camera size={18} className="text-[#F5F2EA]" />
            </button>
            <div className="h-9 w-9" />
          </div>
        </motion.div>
      )}

      {/* selecting */}
      {phase === "selecting" && (
        <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
          <p className="text-xs text-[#8A8780]">{t("booth.selectPhotos")} ({selectedIndices.length}/{myParticipant?.slot_count})</p>
          <div className="grid grid-cols-4 gap-2">
            {photosRef.current.map((src, i) => {
              const selIdx = selectedIndices.indexOf(i);
              return (
                <button key={i} onClick={() => toggleSelect(i)} className={`relative aspect-[3/4] w-16 overflow-hidden rounded-md border-2 transition-all ${selIdx !== -1 ? "border-[#2C2C2A]" : "border-transparent opacity-50 hover:opacity-100"}`}>
                  <Image src={src} alt={`${i}`} fill className="object-cover" unoptimized />
                  {selIdx !== -1 && <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2C2C2A] text-[9px] text-white">{selIdx + 1}</div>}
                </button>
              );
            })}
          </div>
          <button onClick={confirmSelection} disabled={selectedIndices.length !== (myParticipant?.slot_count || 2)} className="rounded-full bg-[#2C2C2A] px-6 py-2.5 text-xs text-[#F5F2EA] disabled:opacity-30">
            {t("booth.confirmSelection")}
          </button>
        </motion.div>
      )}

      {/* uploading / compositing */}
      {(phase === "uploading" || phase === "compositing") && (
        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="animate-spin text-[#8A8780]" />
          <p className="text-xs text-[#8A8780]">{phase === "uploading" ? t("room.uploading") : t("booth.compositing")}</p>
        </motion.div>
      )}

      {/* done */}
      {phase === "done" && stripUrl && (
        <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5">
          <StripResult stripUrl={stripUrl} onRetake={() => setPhase("join")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
