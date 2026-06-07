"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid2X2, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { useLocale } from "@/hooks/use-locale";
import { useSegmentation } from "@/hooks/use-segmentation";
import { captureFrame } from "@/lib/camera";
import { generateGhostStrip } from "@/lib/ghost-composite";
import { LUT_CSS_FILTERS, type LutPreset } from "@/lib/lut";
import { applyMask } from "@/lib/mask";
import {
  collectGhostCutouts,
  getParticipants,
  getRoomErrorMessage,
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
import { getLayout, type FrameLayout } from "@/lib/composite";
import type { CaptureShot } from "@/types/capture";
import type { Room, RoomParticipant } from "@/types/room";
import BottomControlDock from "@/components/bottom-control-dock";
import CaptureStage from "@/components/capture-stage";
import GhostOverlay from "@/components/ghost-overlay";
import ParticipantStatusRail from "@/components/participant-status-rail";
import SegmentationPreview from "@/components/segmentation-preview";
import ShareCard from "@/components/share-card";
import ShotCounter from "@/components/shot-counter";
import StripResult from "@/components/strip-result";

const BETWEEN_SHOT_DELAY = 2000;
type Phase =
  | "join"
  | "shooting"
  | "segmenting"
  | "preview"
  | "uploading"
  | "sharing"
  | "compositing"
  | "done";

interface GhostFlowProps {
  room: Room;
  sessionId: string;
}

export default function GhostFlow({ room, sessionId }: GhostFlowProps) {
  const { videoRef, ready, error, facing, start, stop, flip } = useCamera();
  const { count, run: runCountdown } = useCountdown(5);
  const seg = useSegmentation();
  const { t } = useLocale();

  const existingResult = room.result_path || null;

  const [phase, setPhase] = useState<Phase>(existingResult ? "done" : "join");
  const [displayName, setDisplayName] = useState("");
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [myParticipant, setMyParticipant] = useState<RoomParticipant | null>(null);
  const [shots, setShots] = useState<CaptureShot[]>([]);
  const [cutouts, setCutouts] = useState<string[]>([]);
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
  const fallbackIndicesRef = useRef<Set<number>>(new Set());
  const lut = room.lut_preset as LutPreset;
  const requiredFrames = getLayout(room.layout as FrameLayout).count;
  const roomUrl = getRoomUrl(room.short_code);

  const hostParticipant = useMemo(
    () => participants.find((participant) => participant.role === "host"),
    [participants],
  );
  const hostCutouts = hostParticipant?.photo_paths || [];
  const isHost = myParticipant?.role === "host";

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const compositeGhost = useCallback(async (roomParticipants: RoomParticipant[]) => {
    if (compositingRef.current) return;
    if (resultRef.current) {
      setStripUrl(resultRef.current);
      setPhase("done");
      return;
    }
    const cutoutPair = collectGhostCutouts(roomParticipants, requiredFrames);
    if (!cutoutPair) return;

    compositingRef.current = true;
    setPhase("compositing");
    try {
      const strip = await generateGhostStrip({
        person1Cutouts: cutoutPair.host,
        person2Cutouts: cutoutPair.guest,
        backgroundId: room.background_id,
        layout: room.layout as FrameLayout,
        lut,
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
      setPhase(isHost ? "sharing" : "preview");
      compositingRef.current = false;
    }
  }, [isHost, lut, requiredFrames, room.background_id, room.id, room.layout, t]);

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
    getParticipants(room.id).then((roomParticipants) => {
      const sorted = sortParticipants(roomParticipants);
      setParticipants(sorted);
      const me = sorted.find((participant) => participant.user_id === sessionId);
      if (me) setMyParticipant(me);
      void compositeGhost(sorted);
    });
    return subscribeToParticipants(room.id, (roomParticipants) => {
      const sorted = sortParticipants(roomParticipants);
      setParticipants(sorted);
      const me = sorted.find((participant) => participant.user_id === sessionId);
      if (me) setMyParticipant(me);
      void compositeGhost(sorted);
    });
  }, [compositeGhost, room.id, sessionId]);

  const handleJoin = useCallback(async () => {
    setErrorMsg(null);
    try {
      const shouldBeHost = !hostParticipant;
      const me = await joinRoom(
        room.id,
        sessionId,
        displayName.trim() || (shouldBeHost ? t("booth.you") : t("booth.partner")),
        shouldBeHost,
      );
      setMyParticipant(me);
      start("user");
      void seg.init();
      await updateParticipant(me.id, { status: "shooting" });
      setPhase("shooting");
    } catch (err) {
      setErrorMsg(getRoomErrorMessage(err, t));
    }
  }, [displayName, hostParticipant, room.id, seg, sessionId, start, t]);

  const shoot = useCallback(async () => {
    if (!videoRef.current || !ready || !myParticipant || phase !== "shooting") return;
    if (captureRef.current) return;
    captureRef.current = true;
    setIsCapturing(true);
    const captured: CaptureShot[] = [];

    try {
      setShots([]);
      setCutouts([]);
      fallbackIndicesRef.current = new Set();
      setShotCount(0);
      setLastCapture(null);

      for (let i = 0; i < requiredFrames; i++) {
        await runCountdown(5);
        setFlash(true);
        const { raw, filtered } = captureFrame(videoRef.current, {
          cssFilter: LUT_CSS_FILTERS[lut],
          mirrored: facing === "user",
        });
        captured.push({ index: i, rawUrl: raw, filteredUrl: filtered, selected: true });
        setShots([...captured]);
        setShotCount(i + 1);
        setLastCapture(filtered);
        await sleep(100);
        setFlash(false);
        if (i < requiredFrames - 1) {
          await sleep(BETWEEN_SHOT_DELAY);
          setLastCapture(null);
        }
      }

      stop();
      setPhase("segmenting");
      const nextCutouts: string[] = [];
      let fallbackCount = 0;
      for (const shot of captured) {
        if (!seg.ready) {
          nextCutouts.push(shot.rawUrl);
          fallbackIndicesRef.current.add(shot.index);
          fallbackCount += 1;
          continue;
        }
        try {
          const img = new window.Image();
          img.src = shot.rawUrl;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          const mask = await seg.segment(img as HTMLImageElement);
          const cutout = await applyMask(shot.rawUrl, mask, 4);
          nextCutouts.push(cutout);
        } catch {
          nextCutouts.push(shot.rawUrl);
          fallbackIndicesRef.current.add(shot.index);
          fallbackCount += 1;
        }
        setCutouts([...nextCutouts]);
      }
      setCutouts(nextCutouts);
      if (fallbackCount > 0) {
        setErrorMsg(t("ghost.fallbackNotice"));
      }
      setPhase("preview");
    } catch {
      setFlash(false);
      setErrorMsg(t("error.capture"));
    } finally {
      captureRef.current = false;
      setIsCapturing(false);
    }
  }, [facing, lut, myParticipant, phase, ready, requiredFrames, runCountdown, seg, stop, t, videoRef]);

  const confirmCutouts = useCallback(async () => {
    if (!myParticipant) return;
    if (uploadRef.current) return;
    if (cutouts.length < requiredFrames) {
      setErrorMsg(t("error.selectPhotos"));
      return;
    }
    uploadRef.current = true;
    setPhase("uploading");
    setErrorMsg(null);
    try {
      const urls = await uploadPhotos(room.id, myParticipant.id, cutouts);
      const markedUrls = urls.map((url, index) => fallbackIndicesRef.current.has(index) ? `${url}#fallback` : url);
      await markParticipantSubmitted(myParticipant.id, markedUrls);
      if (myParticipant.role === "host") {
        setPhase("sharing");
      } else {
        const nextParticipants = sortParticipants([
          ...participants.filter((participant) => participant.id !== myParticipant.id),
          { ...myParticipant, status: "submitted", photo_paths: markedUrls },
        ]);
        await compositeGhost(nextParticipants);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("error.selectPhotos"));
      setPhase("preview");
    } finally {
      uploadRef.current = false;
    }
  }, [compositeGhost, cutouts, myParticipant, participants, requiredFrames, room.id, t]);

  const retake = useCallback(async () => {
    if (!myParticipant) return;
    setShots([]);
    setCutouts([]);
    setShotCount(0);
    setLastCapture(null);
    await updateParticipant(myParticipant.id, { status: "shooting" });
    start("user");
    setPhase("shooting");
  }, [myParticipant, start]);

  const canJoin = displayName.trim().length > 0 || Boolean(myParticipant);
  const originals = shots.map((shot) => shot.filteredUrl);

  return (
    <AnimatePresence mode="wait">
      {phase === "join" && (
        <motion.div key="join" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
          <h2 className="font-serif text-3xl italic text-[#2C2C2A]">Duet</h2>
          <p className="text-xs text-[#8A8780]">
            {t("mode.ghost")} / {t("shell.room")} {room.short_code}
          </p>
          <p className="max-w-[17rem] text-center text-[11px] leading-5 text-[#B5864F]">
            {hostCutouts.length > 0 ? t("room.alignGhost") : t("create.takeAndShare")}
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
            disabled={!canJoin}
            className="rounded-full bg-[#2C2C2A] px-7 py-3 text-[13px] font-medium text-[#F5F2EA] disabled:opacity-30"
          >
            {t("join.join")}
          </button>
          {seg.loading && <p className="text-[11px] text-[#8A8780]">{t("booth.loadingModel")}</p>}
          {errorMsg && <p className="max-w-xs text-center text-xs text-[#C45B4A]">{errorMsg}</p>}
        </motion.div>
      )}

      {phase === "shooting" && (
        <motion.div key="camera" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col gap-4">
          <ParticipantStatusRail
            code={room.short_code}
            participants={participants}
            expectedCount={2}
            currentUserId={sessionId}
            centerSubtext={isHost ? t("ghost.captureGuidePose") : t("ghost.alignPartner")}
          />
          <CaptureStage
            ref={videoRef}
            ready={ready}
            loading={seg.loading}
            error={error}
            mirrored={facing === "user"}
            cssFilter={LUT_CSS_FILTERS[lut]}
            count={count}
            flash={flash}
            hint={!isHost && hostCutouts.length > 0 ? t("room.alignGhost") : t("booth.tapToShoot")}
            overlay={!isHost && hostCutouts.length > 0 ? <GhostOverlay cutouts={hostCutouts} currentShot={shotCount} /> : null}
            lastCapture={
              lastCapture ? (
                <div className="absolute bottom-4 right-4 z-10 h-20 w-[3.75rem] overflow-hidden rounded-xl border-2 border-white/85 shadow-lg">
                  <Image src={lastCapture} alt={t("booth.lastCapture")} fill className="object-cover" unoptimized />
                </div>
              ) : null
            }
          />
          <ShotCounter total={requiredFrames} current={shotCount} />
          <BottomControlDock
            onShutter={shoot}
            shutterDisabled={!ready || seg.loading || isCapturing}
            tools={[
              { id: "layout", label: t("booth.toolLayout"), value: room.layout, icon: <Grid2X2 size={22} strokeWidth={1.5} /> },
              { id: "ghost", label: t("booth.toolGhost"), value: hostCutouts.length > 0 ? t("ghost.on") : t("ghost.guide"), icon: <Wand2 size={22} strokeWidth={1.5} />, active: true },
              { id: "filter", label: t("booth.toolFilter"), value: lut, icon: <Sparkles size={22} strokeWidth={1.5} />, active: true },
              { id: "flip", label: t("booth.toolFlip"), value: t("booth.toolLens"), icon: <RefreshCw size={22} strokeWidth={1.5} />, onClick: flip },
            ]}
          />
        </motion.div>
      )}

      {phase === "segmenting" && (
        <motion.div key="seg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 size={22} className="animate-spin text-[#8A8780]" />
          <p className="text-xs text-[#8A8780]">{t("ghost.segmenting")}</p>
        </motion.div>
      )}

      {phase === "preview" && (
        <motion.div key="preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <SegmentationPreview
            originals={originals}
            cutouts={cutouts}
            onConfirm={confirmCutouts}
            onRetake={retake}
          />
          {errorMsg && <p className="mt-3 max-w-xs text-center text-xs text-[#C45B4A]">{errorMsg}</p>}
        </motion.div>
      )}

      {(phase === "uploading" || phase === "compositing") && (
        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 size={22} className="animate-spin text-[#8A8780]" />
          <p className="text-xs text-[#8A8780]">
            {phase === "uploading" ? t("room.uploading") : t("booth.compositing")}
          </p>
        </motion.div>
      )}

      {phase === "sharing" && (
        <motion.div key="sharing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
          <ParticipantStatusRail
            code={room.short_code}
            participants={participants}
            expectedCount={2}
            currentUserId={sessionId}
            centerSubtext={t("create.waiting")}
          />
          <ShareCard url={roomUrl} code={room.short_code} />
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4A574]" />
            <p className="text-[11px] text-[#8A8780]">{t("create.waiting")}</p>
          </div>
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
