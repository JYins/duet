"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid2X2, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { captureFrame } from "@/lib/camera";
import { generateStrip, type FrameLayout } from "@/lib/composite";
import { LUT_CSS_FILTERS, type LutPreset } from "@/lib/lut";
import {
  collectSubmittedPhotos,
  getParticipants,
  getRoomUrl,
  joinRoom,
  markParticipantSubmitted,
  markRoomComplete,
  sortParticipants,
  subscribeToRoom,
  subscribeToParticipants,
  updateParticipant,
  uploadPhotos,
  uploadResultStrip,
} from "@/lib/rooms";
import type { CaptureShot } from "@/types/capture";
import type { Room, RoomParticipant } from "@/types/room";
import BottomControlDock from "@/components/bottom-control-dock";
import CaptureStage from "@/components/capture-stage";
import ParticipantStatusRail from "@/components/participant-status-rail";
import PhotoStripPreview from "@/components/photo-strip-preview";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";
import WaitingRoom from "@/components/waiting-room";

const BETWEEN_SHOT_DELAY = 2000;

type Phase = "join" | "waiting" | "shooting" | "selecting" | "uploading" | "submitted" | "compositing" | "done";

interface AsyncFlowProps {
  room: Room;
  sessionId: string;
}

export default function AsyncFlow({ room, sessionId }: AsyncFlowProps) {
  const { videoRef, ready, error, facing, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(5);
  const { t } = useLocale();

  const existingResult = room.result_path || null;

  const [phase, setPhase] = useState<Phase>(existingResult ? "done" : "join");
  const [displayName, setDisplayName] = useState("");
  const [myParticipant, setMyParticipant] = useState<RoomParticipant | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [shots, setShots] = useState<CaptureShot[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [stripUrl, setStripUrl] = useState<string | null>(existingResult);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const compositingRef = useRef(false);
  const captureRef = useRef(false);
  const uploadRef = useRef(false);
  const resultRef = useRef(existingResult);
  const lut = room.lut_preset as LutPreset;
  const neededCount = myParticipant?.slot_count || 2;
  const totalToTake = Math.max(neededCount + 2, neededCount);
  const roomUrl = getRoomUrl(room.short_code);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const compositeAll = useCallback(async (roomParticipants: RoomParticipant[]) => {
    if (compositingRef.current) return;
    if (resultRef.current) {
      setStripUrl(resultRef.current);
      setPhase("done");
      return;
    }
    const photos = collectSubmittedPhotos(roomParticipants, room.participant_count);
    if (!photos) return;
    compositingRef.current = true;
    setPhase("compositing");
    try {
      const strip = await generateStrip({
        photos,
        layout: room.layout as FrameLayout,
        lut,
        grain: true,
        vignette: true,
      });
      let finalUrl = strip;
      try {
        const uploaded = await uploadResultStrip(room.id, strip);
        finalUrl = uploaded;
        const completed = await markRoomComplete(room.id, uploaded);
        finalUrl = completed?.result_path || uploaded;
        resultRef.current = finalUrl;
      } catch {
        setErrorMsg(t("error.cloudSync"));
      }
      setStripUrl(finalUrl);
      setPhase("done");
    } catch {
      setErrorMsg(t("error.composite"));
      setPhase("submitted");
      compositingRef.current = false;
    }
  }, [lut, room.id, room.layout, room.participant_count, t]);

  useEffect(() => {
    return subscribeToRoom(room.id, (nextRoom) => {
      if (nextRoom.result_path) {
        resultRef.current = nextRoom.result_path;
        setStripUrl(nextRoom.result_path);
        setPhase("done");
      }
    });
  }, [room.id]);

  useEffect(() => {
    if (phase === "join") return;
    getParticipants(room.id).then((roomParticipants) => {
      const sorted = sortParticipants(roomParticipants);
      setParticipants(sorted);
      if (phase === "submitted" || phase === "waiting") void compositeAll(sorted);
    });
    return subscribeToParticipants(room.id, (roomParticipants) => {
      const sorted = sortParticipants(roomParticipants);
      setParticipants(sorted);
      if (phase === "submitted" || phase === "waiting") void compositeAll(sorted);
    });
  }, [compositeAll, phase, room.id]);

  const handleJoin = useCallback(async () => {
    setErrorMsg(null);
    try {
      const me = await joinRoom(room.id, sessionId, displayName.trim() || t("join.guest"));
      setMyParticipant(me);
      setPhase(me.status === "submitted" ? "submitted" : "waiting");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("room.notFound"));
    }
  }, [displayName, room.id, sessionId, t]);

  const startShooting = useCallback(async () => {
    if (!myParticipant) return;
    await updateParticipant(myParticipant.id, { status: "shooting" });
    start("user");
    setPhase("shooting");
  }, [myParticipant, start]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !myParticipant || phase !== "shooting") return;
    if (captureRef.current) return;
    captureRef.current = true;
    setIsCapturing(true);
    const captured: CaptureShot[] = [];

    try {
      setShots([]);
      setSelectedIndices([]);
      setShotCount(0);
      setLastCapture(null);

      for (let i = 0; i < totalToTake; i++) {
        await runCountdown(5);
        setFlash(true);
        const { raw, filtered } = captureFrame(
          videoRef.current,
          1080,
          1440,
          LUT_CSS_FILTERS[lut],
          facing === "user",
        );
        const shot = { index: i, rawUrl: raw, filteredUrl: filtered, selected: i < neededCount };
        captured.push(shot);
        setShots([...captured]);
        setShotCount(i + 1);
        setLastCapture(filtered);
        await sleep(100);
        setFlash(false);
        if (i < totalToTake - 1) {
          await sleep(BETWEEN_SHOT_DELAY);
          setLastCapture(null);
        }
      }

      stop();
      await updateParticipant(myParticipant.id, { status: "selecting" });
      setSelectedIndices(captured.slice(0, neededCount).map((shot) => shot.index));
      setPhase("selecting");
    } catch {
      setFlash(false);
      setErrorMsg(t("error.capture"));
    } finally {
      captureRef.current = false;
      setIsCapturing(false);
    }
  }, [facing, lut, myParticipant, neededCount, phase, ready, runCountdown, stop, t, totalToTake, videoRef]);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) return prev.filter((item) => item !== idx);
      if (prev.length >= neededCount) return prev;
      return [...prev, idx];
    });
  }, [neededCount]);

  const submitPhotos = useCallback(async () => {
    if (!myParticipant || selectedIndices.length !== neededCount) return;
    if (uploadRef.current) return;
    uploadRef.current = true;
    setPhase("uploading");
    setErrorMsg(null);
    try {
      const selected = selectedIndices
        .map((idx) => shots.find((shot) => shot.index === idx)?.rawUrl)
        .filter((src): src is string => Boolean(src));
      if (selected.length < neededCount) {
        throw new Error(t("error.selectPhotos"));
      }
      const urls = await uploadPhotos(room.id, myParticipant.id, selected);
      await markParticipantSubmitted(myParticipant.id, urls);
      setPhase("submitted");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("error.selectPhotos"));
      setPhase("selecting");
    } finally {
      uploadRef.current = false;
    }
  }, [myParticipant, neededCount, room.id, selectedIndices, shots, t]);

  return (
    <AnimatePresence mode="wait">
      {phase === "join" && (
        <motion.div key="join" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
          <h2 className="font-serif text-3xl italic text-[#2C2C2A]">Duet</h2>
          <p className="text-xs text-[#8A8780]">
            {t("shell.room")} {room.short_code} / {room.participant_count} {t("config.participants")}
          </p>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t("join.enterName")}
            maxLength={20}
            className="w-56 rounded-full border border-[#2C2C2A]/10 bg-[#FDFCF9] px-5 py-3 text-center text-[13px] text-[#2C2C2A] placeholder:text-[#B5B2AB] focus:border-[#D4A574]/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleJoin}
            disabled={!displayName.trim()}
            className="rounded-full bg-[#2C2C2A] px-7 py-3 text-[13px] font-medium text-[#F5F2EA] disabled:opacity-30"
          >
            {t("join.join")}
          </button>
          {errorMsg && <p className="max-w-xs text-center text-xs text-[#C45B4A]">{errorMsg}</p>}
        </motion.div>
      )}

      {(phase === "waiting" || phase === "submitted") && (
        <motion.div key="waiting" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
          <ParticipantStatusRail
            code={room.short_code}
            participants={participants}
            expectedCount={room.participant_count}
            currentUserId={sessionId}
          />
          <WaitingRoom
            roomUrl={roomUrl}
            roomCode={room.short_code}
            participants={participants}
            expectedCount={room.participant_count}
            currentUserId={sessionId}
            onStartShooting={phase === "waiting" && myParticipant?.status === "joined" ? startShooting : undefined}
          />
          {errorMsg && <p className="max-w-xs text-center text-xs text-[#C45B4A]">{errorMsg}</p>}
        </motion.div>
      )}

      {phase === "shooting" && (
        <motion.div key="camera" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col gap-4">
          <ParticipantStatusRail
            code={room.short_code}
            participants={participants}
            expectedCount={room.participant_count}
            currentUserId={sessionId}
          />
          <CaptureStage
            ref={videoRef}
            ready={ready}
            error={error}
            mirrored={facing === "user"}
            cssFilter={LUT_CSS_FILTERS[lut]}
            count={count}
            flash={flash}
            hint={t("booth.tapToShoot")}
            lastCapture={
              lastCapture ? (
                <div className="absolute bottom-4 right-4 z-10 h-20 w-[3.75rem] overflow-hidden rounded-xl border-2 border-white/85 shadow-lg">
                  <Image src={lastCapture} alt={t("booth.lastCapture")} fill className="object-cover" unoptimized />
                </div>
              ) : null
            }
          />
          <ShotCounter total={totalToTake} current={shotCount} />
          <BottomControlDock
            onShutter={shoot}
            shutterDisabled={!ready || isCapturing}
            tools={[
              { id: "layout", label: t("booth.toolLayout"), value: room.layout, icon: <Grid2X2 size={22} strokeWidth={1.5} /> },
              { id: "ghost", label: t("booth.toolTogether"), value: t("shell.room"), icon: <Wand2 size={22} strokeWidth={1.5} /> },
              { id: "filter", label: t("booth.toolFilter"), value: lut, icon: <Sparkles size={22} strokeWidth={1.5} />, active: true },
              { id: "flip", label: t("booth.toolFlip"), value: t("booth.toolLens"), icon: <RefreshCw size={22} strokeWidth={1.5} />, onClick: flip },
            ]}
          />
        </motion.div>
      )}

      {phase === "selecting" && (
        <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-5">
          <div className="text-center">
            <p className="font-serif text-2xl italic text-[#2C2C2A]">{t("booth.selectPhotos")}</p>
            <p className="mt-1 text-xs text-[#8A8780]">{selectedIndices.length}/{neededCount}</p>
          </div>
          <PhotoStripPreview shots={shots} selectedIndices={selectedIndices} onToggle={toggleSelect} neededCount={neededCount} />
          <button
            type="button"
            onClick={submitPhotos}
            disabled={selectedIndices.length !== neededCount}
            className="rounded-full bg-[#2C2C2A] px-7 py-3 text-[13px] font-medium text-[#F5F2EA] disabled:opacity-30"
          >
            {t("booth.confirmSelection")}
          </button>
        </motion.div>
      )}

      {(phase === "uploading" || phase === "compositing") && (
        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 size={22} className="animate-spin text-[#8A8780]" />
          <p className="text-xs tracking-wide text-[#8A8780]">
            {phase === "uploading" ? t("room.uploading") : t("room.compositing")}
          </p>
        </motion.div>
      )}

      {phase === "done" && stripUrl && (
        <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-5">
          <StripResult stripUrl={stripUrl} />
          {errorMsg && <p className="max-w-xs text-center text-xs text-[#C45B4A]">{errorMsg}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
