"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Grid2X2, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { useSessionId } from "@/hooks/use-session-id";
import { captureFrame } from "@/lib/camera";
import { generateStrip } from "@/lib/composite";
import { LUT_CSS_FILTERS, type LutPreset } from "@/lib/lut";
import {
  collectSubmittedPhotos,
  createRoom,
  getParticipants,
  getRoomUrl,
  joinRoom,
  markParticipantSubmitted,
  markRoomComplete,
  sortParticipants,
  subscribeToRoom,
  subscribeToParticipants,
  uploadPhotos,
  uploadResultStrip,
  updateParticipant,
} from "@/lib/rooms";
import type { RoomMode, RoomParticipant } from "@/types/room";
import type { CaptureShot } from "@/types/capture";
import BoothShell from "@/components/booth-shell";
import BottomControlDock from "@/components/bottom-control-dock";
import CaptureStage from "@/components/capture-stage";
import LutPicker from "@/components/lut-picker";
import ModePicker from "@/components/mode-picker";
import ParticipantStatusRail from "@/components/participant-status-rail";
import PhotoStripPreview from "@/components/photo-strip-preview";
import RoomConfig, { type RoomSettings } from "@/components/room-config";
import ShareCard from "@/components/share-card";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";
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
  const router = useRouter();
  const { videoRef, ready, error, facing, start, stop, flip } = useCamera();
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
  const [shots, setShots] = useState<CaptureShot[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [shotCount, setShotCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(5);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const compositingRef = useRef(false);
  const captureRef = useRef(false);
  const uploadRef = useRef(false);
  const resultRef = useRef<string | null>(null);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const neededCount = myParticipant?.slot_count || 4;
  const lut = settings?.lut || "k-booth";

  const compositeAll = useCallback(async (roomParticipants: RoomParticipant[]) => {
    if (!settings || !roomId || compositingRef.current) return;
    if (resultRef.current) {
      setStripUrl(resultRef.current);
      setPhase("done");
      return;
    }
    const photos = collectSubmittedPhotos(roomParticipants, settings.participantCount);
    if (!photos) return;
    compositingRef.current = true;
    setPhase("compositing");
    try {
      const strip = await generateStrip({
        photos,
        layout: settings.layout,
        lut: settings.lut,
        grain: true,
        vignette: true,
      });
      let finalUrl = strip;
      try {
        const uploaded = await uploadResultStrip(roomId, strip);
        finalUrl = uploaded;
        const completed = await markRoomComplete(roomId, uploaded);
        finalUrl = completed?.result_path || uploaded;
        resultRef.current = finalUrl;
      } catch {
        setErrorMsg(t("error.cloudSync"));
      }
      setStripUrl(finalUrl);
      setPhase("done");
    } catch {
      setErrorMsg(t("error.composite"));
      setPhase("waiting");
      compositingRef.current = false;
    }
  }, [roomId, settings, t]);

  useEffect(() => {
    if (!roomId || (phase !== "sharing" && phase !== "waiting")) return;
    getParticipants(roomId).then((roomParticipants) => {
      const sorted = sortParticipants(roomParticipants);
      setParticipants(sorted);
      if (phase === "waiting") void compositeAll(sorted);
    });
    return subscribeToParticipants(roomId, (roomParticipants) => {
      const sorted = sortParticipants(roomParticipants);
      setParticipants(sorted);
      if (phase === "waiting") void compositeAll(sorted);
    });
  }, [compositeAll, phase, roomId]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeToRoom(roomId, (room) => {
      if (room.result_path) {
        resultRef.current = room.result_path;
        setStripUrl(room.result_path);
        setPhase("done");
      }
    });
  }, [roomId]);

  const handleModePick = useCallback((nextMode: RoomMode) => {
    setMode(nextMode);
    setPhase("config");
  }, []);

  const handleConfigConfirm = useCallback(async (nextSettings: RoomSettings) => {
    setSettings(nextSettings);
    setErrorMsg(null);
    try {
      const room = await createRoom({
        mode,
        layout: nextSettings.layout,
        lutPreset: nextSettings.lut,
        participantCount: nextSettings.participantCount,
        backgroundId: nextSettings.backgroundId,
      });
      setRoomId(room.id);
      setRoomCode(room.short_code);
      setRoomUrl(getRoomUrl(room.short_code));
      resultRef.current = null;

      const host = await joinRoom(room.id, sessionId, t("booth.you"), true);
      if (mode === "ghost") {
        router.push(`/room/${room.short_code}`);
        return;
      }
      setMyParticipant(host);
      setParticipants([host]);
      setPhase("sharing");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("error.composite"));
    }
  }, [mode, router, sessionId, t]);

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
    const totalToTake = Math.max(neededCount + 2, neededCount);
    const captured: CaptureShot[] = [];

    try {
      setShots([]);
      setSelectedIndices([]);
      setShotCount(0);
      setLastCapture(null);

      for (let i = 0; i < totalToTake; i++) {
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
  }, [countdownSec, facing, lut, myParticipant, neededCount, phase, ready, runCountdown, stop, t, videoRef]);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) return prev.filter((item) => item !== idx);
      if (prev.length >= neededCount) return prev;
      return [...prev, idx];
    });
  }, [neededCount]);

  const submitPhotos = useCallback(async () => {
    if (!roomId || !myParticipant || selectedIndices.length !== neededCount) return;
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
      const urls = await uploadPhotos(roomId, myParticipant.id, selected);
      await markParticipantSubmitted(myParticipant.id, urls);
      setPhase("waiting");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("error.selectPhotos"));
      setPhase("selecting");
    } finally {
      uploadRef.current = false;
    }
  }, [myParticipant, neededCount, roomId, selectedIndices, shots, t]);

  const retake = useCallback(() => {
    compositingRef.current = false;
    setPhase("pick-mode");
    setSettings(null);
    setRoomId(null);
    setRoomCode(null);
    setRoomUrl(null);
    setMyParticipant(null);
    setParticipants([]);
    setShots([]);
    setStripUrl(null);
    setSelectedIndices([]);
    setShotCount(0);
    setLastCapture(null);
  }, []);

  const regrade = useCallback(async (preset: LutPreset) => {
    if (!settings || phase !== "done") return;
    const nextSettings = { ...settings, lut: preset };
    setSettings(nextSettings);
    const photos = collectSubmittedPhotos(participants, settings.participantCount);
    if (!photos) return;
    setPhase("compositing");
    const strip = await generateStrip({
      photos,
      layout: settings.layout,
      lut: preset,
      grain: true,
      vignette: true,
    });
    setStripUrl(strip);
    setPhase("done");
  }, [participants, phase, settings]);

  const title = phase === "done" ? t("create.yourDuet") : t("create.title");

  return (
    <BoothShell eyebrow={title} code={roomCode ?? undefined} step={phase === "done" ? "STEP 4 / 4" : undefined}>
      {errorMsg && (
        <div className="rounded-2xl border border-[#C45B4A]/20 bg-[#FFF7F4] px-4 py-3 text-center text-xs text-[#A44B3D]">
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === "pick-mode" && (
          <motion.div key="mode" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ModePicker onSelect={handleModePick} />
          </motion.div>
        )}

        {phase === "config" && (
          <motion.div key="config" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <RoomConfig mode={mode} onConfirm={handleConfigConfirm} />
          </motion.div>
        )}

        {(phase === "sharing" || phase === "waiting") && roomCode && roomUrl && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <ParticipantStatusRail
              code={roomCode}
              participants={participants}
              expectedCount={settings?.participantCount || 2}
              currentUserId={sessionId}
            />
            {phase === "sharing" ? (
              <div className="space-y-4">
                <ShareCard url={roomUrl} code={roomCode} />
                <button
                  type="button"
                  onClick={startShooting}
                  className="w-full rounded-full bg-[#2C2C2A] px-6 py-3 text-[13px] font-medium text-[#F5F2EA]"
                >
                  {t("waiting.startShooting")}
                </button>
              </div>
            ) : (
              <WaitingRoom
                roomUrl={roomUrl}
                roomCode={roomCode}
                participants={participants}
                expectedCount={settings?.participantCount || 2}
                currentUserId={sessionId}
              />
            )}
          </motion.div>
        )}

        {phase === "shooting" && (
          <motion.div key="camera" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col gap-4">
            <ParticipantStatusRail
              code={roomCode ?? undefined}
              participants={participants}
              expectedCount={settings?.participantCount || 2}
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
            <ShotCounter total={Math.max(neededCount + 2, neededCount)} current={shotCount} />
            <div className="flex justify-center text-[11px] text-[#6F6A61]">
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
            </div>
            <BottomControlDock
              onShutter={shoot}
              shutterDisabled={!ready || isCapturing}
              tools={[
                { id: "layout", label: t("booth.toolLayout"), value: settings?.layout, icon: <Grid2X2 size={22} strokeWidth={1.5} /> },
                { id: "ghost", label: mode === "ghost" ? t("booth.toolGhost") : t("booth.toolTogether"), value: mode === "ghost" ? t("ghost.on") : t("shell.room"), icon: <Wand2 size={22} strokeWidth={1.5} />, active: mode === "ghost" },
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
              {phase === "uploading" ? t("room.uploading") : t("booth.compositing")}
            </p>
          </motion.div>
        )}

        {phase === "done" && stripUrl && (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-5">
            <StripResult stripUrl={stripUrl} onRetake={retake} />
            <LutPicker value={settings?.lut || "k-booth"} onChange={regrade} />
          </motion.div>
        )}
      </AnimatePresence>
    </BoothShell>
  );
}
