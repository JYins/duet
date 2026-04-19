"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { useSessionId } from "@/hooks/use-session-id";
import { captureFrame } from "@/lib/camera";
import { generateStrip } from "@/lib/composite";
import { getLayout } from "@/lib/composite";
import { LUT_CSS_FILTERS } from "@/lib/lut";
import type { LutPreset } from "@/lib/lut";
import type { FrameLayout } from "@/lib/composite";
import type { RoomMode, RoomParticipant } from "@/types/room";
import {
  createRoom,
  joinRoom,
  updateRoom,
  updateParticipant,
  uploadPhotos,
  getRoomUrl,
  subscribeToParticipants,
  getParticipants,
} from "@/lib/rooms";
import Viewfinder from "@/components/viewfinder";
import CountdownOverlay from "@/components/countdown-overlay";
import ShutterFlash from "@/components/shutter-flash";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";
import LutPicker from "@/components/lut-picker";
import ModePicker from "@/components/mode-picker";
import RoomConfig, { type RoomSettings } from "@/components/room-config";
import WaitingRoom from "@/components/waiting-room";

const BETWEEN_SHOT_DELAY = 2000;

type Phase =
  | "pick-mode"
  | "config"
  | "sharing"
  | "shooting"
  | "selecting"
  | "uploading"
  | "waiting"
  | "compositing"
  | "done";

export default function CreatePage() {
  const { videoRef, ready, error, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(5);
  const { t } = useLocale();
  const sessionId = useSessionId();

  const [phase, setPhase] = useState<Phase>("pick-mode");
  const [mode, setMode] = useState<RoomMode>("async");
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [myParticipant, setMyParticipant] = useState<RoomParticipant | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(5);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const photosRef = useRef<string[]>([]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // 1. pick mode
  const handleModePick = useCallback((m: RoomMode) => {
    setMode(m);
    setPhase("config");
  }, []);

  // 2. confirm config → create room
  const handleConfigConfirm = useCallback(async (s: RoomSettings) => {
    setSettings(s);
    try {
      const room = await createRoom({
        mode,
        layout: s.layout,
        lutPreset: s.lut,
        participantCount: s.participantCount,
        backgroundId: s.backgroundId,
      });
      setRoomId(room.id);
      setRoomCode(room.short_code);
      setRoomUrl(getRoomUrl(room.short_code));

      // auto-join as host
      const me = await joinRoom(room.id, sessionId, "host", true);
      setMyParticipant(me);

      setPhase("sharing");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "failed to create room");
    }
  }, [mode, sessionId]);

  // subscribe to participants when in sharing/waiting phase
  useEffect(() => {
    if (!roomId || (phase !== "sharing" && phase !== "waiting")) return;
    // initial fetch
    getParticipants(roomId).then(setParticipants);
    return subscribeToParticipants(roomId, (ps) => {
      setParticipants(ps);
      // check if all submitted
      const allDone = ps.filter((p) => p.status === "submitted").length >= (settings?.participantCount || 2);
      if (allDone && phase === "waiting") {
        compositeAll(ps);
      }
    });
  }, [roomId, phase]);

  // host starts shooting
  const startShooting = useCallback(async () => {
    if (!myParticipant) return;
    start("user");
    await updateParticipant(myParticipant.id, { status: "shooting" });
    setPhase("shooting");
  }, [myParticipant, start]);

  // shoot
  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !myParticipant) return;

    const neededPhotos = myParticipant.slot_count;
    // take extra for selection
    const totalToTake = Math.max(neededPhotos, neededPhotos + 2);

    photosRef.current = [];
    setShotCount(0);

    for (let i = 0; i < totalToTake; i++) {
      await runCountdown(countdownSec);
      setFlash(true);
      const frame = captureFrame(videoRef.current);
      photosRef.current.push(frame);
      setShotCount(i + 1);
      setLastCapture(frame);
      await sleep(100);
      setFlash(false);
      if (i < totalToTake - 1) {
        await sleep(BETWEEN_SHOT_DELAY);
        setLastCapture(null);
      }
    }

    stop();

    // if took exactly what's needed, skip selection
    if (totalToTake <= neededPhotos) {
      await submitPhotos(photosRef.current.slice(0, neededPhotos));
    } else {
      setPhase("selecting");
    }
  }, [ready, videoRef, runCountdown, countdownSec, stop, myParticipant]);

  // photo selection
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      const needed = myParticipant?.slot_count || 4;
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= needed) return prev;
      return [...prev, idx];
    });
  }, [myParticipant]);

  const confirmSelection = useCallback(async () => {
    const picks = selectedIndices.map((i) => photosRef.current[i]);
    await submitPhotos(picks);
  }, [selectedIndices]);

  const submitPhotos = useCallback(async (photos: string[]) => {
    if (!roomId || !myParticipant) return;
    setPhase("uploading");
    try {
      const urls = await uploadPhotos(roomId, myParticipant.id, photos);
      await updateParticipant(myParticipant.id, {
        status: "submitted",
        photo_paths: urls,
      });
      setPhase("waiting");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "upload failed");
    }
  }, [roomId, myParticipant]);

  // composite when all done
  const compositeAll = useCallback(async (ps: RoomParticipant[]) => {
    if (!settings) return;
    setPhase("compositing");

    // collect all photo urls in slot order
    const sorted = [...ps].sort((a, b) => a.slot_start - b.slot_start);
    const allPhotos: string[] = [];
    for (const p of sorted) {
      allPhotos.push(...p.photo_paths);
    }

    try {
      const strip = await generateStrip({
        photos: allPhotos,
        layout: settings.layout,
        lut: settings.lut,
        label: undefined,
      });
      setStripUrl(strip);
      setPhase("done");
    } catch {
      setErrorMsg("compositing failed");
    }
  }, [settings]);

  const retake = useCallback(() => {
    setPhase("pick-mode");
    setSettings(null);
    setRoomId(null);
    setRoomCode(null);
    setRoomUrl(null);
    setMyParticipant(null);
    setParticipants([]);
    setStripUrl(null);
    setSelectedIndices([]);
    photosRef.current = [];
  }, []);

  const regrade = useCallback(async (preset: LutPreset) => {
    if (!settings || phase !== "done") return;
    setSettings({ ...settings, lut: preset });
    // re-collect photos
    const sorted = [...participants].sort((a, b) => a.slot_start - b.slot_start);
    const allPhotos = sorted.flatMap((p) => p.photo_paths);
    setPhase("compositing");
    const strip = await generateStrip({
      photos: allPhotos,
      layout: settings.layout,
      lut: preset,
    });
    setStripUrl(strip);
    setPhase("done");
  }, [settings, phase, participants]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[#F5F2EA]">
      <header className="flex w-full max-w-lg items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-3 sm:px-6 sm:pt-8">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-base italic text-[#2C2C2A]/40 sm:text-lg">
          Duet
        </motion.span>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] tracking-wider text-[#D4A574] uppercase sm:text-xs">
          {phase === "done" ? t("create.yourDuet") : t("create.title")}
        </motion.span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{errorMsg}</div>
        )}

        <AnimatePresence mode="wait">
          {/* pick mode */}
          {phase === "pick-mode" && (
            <motion.div key="mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModePicker onSelect={handleModePick} />
            </motion.div>
          )}

          {/* config */}
          {phase === "config" && (
            <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RoomConfig mode={mode} onConfirm={handleConfigConfirm} />
            </motion.div>
          )}

          {/* sharing + waiting for participants */}
          {(phase === "sharing" || phase === "waiting") && roomCode && roomUrl && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WaitingRoom
                roomUrl={roomUrl}
                roomCode={roomCode}
                participants={participants}
                expectedCount={settings?.participantCount || 2}
                currentUserId={sessionId}
                onStartShooting={phase === "sharing" ? startShooting : undefined}
              />
            </motion.div>
          )}

          {/* shooting */}
          {phase === "shooting" && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center gap-4">
              <div className="relative">
                <Viewfinder ref={videoRef} cssFilter={LUT_CSS_FILTERS[settings?.lut || "warm-film"]} />
                <CountdownOverlay count={count} />
                <ShutterFlash flash={flash} />
                {!ready && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#2C2C2A]/50 backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin text-white/80" />
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

              <ShotCounter total={myParticipant ? myParticipant.slot_count + 2 : 4} current={shotCount} />

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

              <div className="flex items-center gap-5">
                <button onClick={flip} disabled={shotCount > 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD9D0] text-[#2C2C2A]/60 disabled:opacity-30 sm:h-10 sm:w-10">
                  <RefreshCw size={15} />
                </button>
                <button onClick={shoot} disabled={!ready || shotCount > 0} className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2A] transition-all hover:scale-105 active:scale-95 disabled:opacity-30 sm:h-16 sm:w-16">
                  <span className="absolute inset-0 rounded-full border-2 border-[#2C2C2A]/20 group-hover:border-[#D4A574]/40" />
                  <Camera size={18} className="text-[#F5F2EA]" />
                </button>
                <div className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>
            </motion.div>
          )}

          {/* selecting */}
          {phase === "selecting" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
              <p className="text-xs tracking-wide text-[#8A8780]">
                {t("booth.selectPhotos")} ({selectedIndices.length}/{myParticipant?.slot_count || 4})
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {photosRef.current.map((src, i) => {
                  const selIdx = selectedIndices.indexOf(i);
                  const isSelected = selIdx !== -1;
                  return (
                    <button key={i} onClick={() => toggleSelect(i)} className={`relative aspect-[3/4] w-16 overflow-hidden rounded-md border-2 transition-all sm:w-20 ${isSelected ? "border-[#2C2C2A] shadow-sm" : "border-transparent opacity-50 hover:opacity-100"}`}>
                      <Image src={src} alt={`${i}`} fill className="object-cover" unoptimized />
                      {isSelected && <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2C2C2A] text-[9px] font-medium text-white">{selIdx + 1}</div>}
                    </button>
                  );
                })}
              </div>
              <button onClick={confirmSelection} disabled={selectedIndices.length !== (myParticipant?.slot_count || 4)} className="rounded-full bg-[#2C2C2A] px-6 py-2.5 text-xs tracking-wide text-[#F5F2EA] disabled:opacity-30">
                {t("booth.confirmSelection")}
              </button>
            </motion.div>
          )}

          {/* uploading / compositing */}
          {(phase === "uploading" || phase === "compositing") && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
              <Loader2 size={20} className="animate-spin text-[#8A8780]" />
              <p className="text-xs tracking-wide text-[#8A8780]">
                {phase === "uploading" ? t("room.uploading") : t("booth.compositing")}
              </p>
            </motion.div>
          )}

          {/* done */}
          {phase === "done" && stripUrl && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5">
              <StripResult stripUrl={stripUrl} onRetake={retake} />
              <LutPicker value={settings?.lut || "warm-film"} onChange={regrade} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
