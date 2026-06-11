"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Camera, Check, Clock, RotateCcw } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { ParticipantStatus, RoomParticipant } from "@/types/room";
import ShareCard from "./share-card";

interface WaitingRoomProps {
  roomUrl: string;
  roomCode: string;
  participants: RoomParticipant[];
  expectedCount: number;
  currentUserId: string;
  onStartShooting?: () => void;
  onRetake?: () => void;
}

const STATUS_ICON = {
  joined: Clock,
  shooting: Camera,
  selecting: Camera,
  submitted: Check,
  error: AlertTriangle,
} satisfies Record<ParticipantStatus, typeof Clock>;

const STATUS_COLOR = {
  joined: "text-[#8A8780]",
  shooting: "text-[#D4A574]",
  selecting: "text-[#D4A574]",
  submitted: "text-[#6B8E6B]",
  error: "text-[#B85C5C]",
} satisfies Record<ParticipantStatus, string>;

export default function WaitingRoom({
  roomUrl,
  roomCode,
  participants,
  expectedCount,
  currentUserId,
  onStartShooting,
  onRetake,
}: WaitingRoomProps) {
  const { t } = useLocale();
  const submittedCount = participants.filter((p) => p.status === "submitted").length;
  const allSubmitted = submittedCount >= expectedCount;
  const me = participants.find((p) => p.user_id === currentUserId);
  const canShoot = me && me.status === "joined";
  const canRetake = !allSubmitted && me?.status === "submitted" && Boolean(onRetake);
  const progress = Math.min(1, submittedCount / Math.max(1, expectedCount));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6"
    >
      <ShareCard url={roomUrl} code={roomCode} />

      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#B5B2AB]">
          {t("waiting.participants")} ({participants.length}/{expectedCount})
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8E1D5]">
          <motion.div
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            className="h-full rounded-full bg-[#D4A574]"
          />
        </div>

        <div className="flex w-full flex-col gap-1.5">
          {participants.map((participant) => {
            const Icon = STATUS_ICON[participant.status];
            const color = STATUS_COLOR[participant.status];
            const isMe = participant.user_id === currentUserId;

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
                  isMe ? "border border-[#D4A574]/20 bg-[#FDFCF9]" : "bg-[#FDFCF9]/50"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDE9DF] text-[11px] font-medium text-[#2C2C2A]">
                  {(participant.display_name || "?")[0].toUpperCase()}
                </div>
                <span className="flex-1 text-xs text-[#2C2C2A]">
                  {participant.display_name || "anonymous"}
                  {isMe && <span className="ml-1 text-[#D4A574]">you</span>}
                  {participant.role === "host" && (
                    <span className="ml-1 text-[9px] text-[#8A8780]">host</span>
                  )}
                </span>
                <Icon size={14} strokeWidth={1.5} className={color} />
              </div>
            );
          })}

          {Array.from({ length: Math.max(0, expectedCount - participants.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 rounded-lg px-4 py-2.5 opacity-30">
              <div className="h-7 w-7 rounded-full border border-dashed border-[#DDD9D0]" />
              <span className="text-xs text-[#8A8780]">...</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {allSubmitted ? (
          <span className="text-xs tracking-wide text-[#6B8E6B]">{t("waiting.allSubmitted")}</span>
        ) : canRetake && onRetake ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onRetake}
            className="flex items-center gap-2 rounded-full border border-[#2C2C2A]/10 bg-[#FDFCF9] px-6 py-2.5 text-xs tracking-wide text-[#2C2C2A] shadow-sm"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
            {t("result.retake")}
          </motion.button>
        ) : canShoot && onStartShooting ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onStartShooting}
            className="flex items-center gap-2 rounded-full bg-[#2C2C2A] px-6 py-2.5 text-xs tracking-wide text-[#F5F2EA]"
          >
            <Camera size={14} strokeWidth={1.5} />
            {t("waiting.startShooting")}
          </motion.button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4A574]" />
            <span className="text-[10px] tracking-wide text-[#8A8780]">{t("waiting.waitingOthers")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
