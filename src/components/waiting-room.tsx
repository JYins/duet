"use client";

import { motion } from "framer-motion";
import { Check, Clock, Camera } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { RoomParticipant } from "@/types/room";
import ShareCard from "./share-card";

interface WaitingRoomProps {
  roomUrl: string;
  roomCode: string;
  participants: RoomParticipant[];
  expectedCount: number;
  currentUserId: string;
  onStartShooting?: () => void;
}

const STATUS_ICON = {
  joined: Clock,
  shooting: Camera,
  selecting: Camera,
  submitted: Check,
};

const STATUS_COLOR = {
  joined: "text-[#8A8780]",
  shooting: "text-[#D4A574]",
  selecting: "text-[#D4A574]",
  submitted: "text-[#6B8E6B]",
};

export default function WaitingRoom({
  roomUrl,
  roomCode,
  participants,
  expectedCount,
  currentUserId,
  onStartShooting,
}: WaitingRoomProps) {
  const { t } = useLocale();
  const submittedCount = participants.filter((p) => p.status === "submitted").length;
  const allSubmitted = submittedCount >= expectedCount;
  const me = participants.find((p) => p.user_id === currentUserId);
  const canShoot = me && me.status === "joined";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6"
    >
      <ShareCard url={roomUrl} code={roomCode} />

      {/* participant list */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <span className="text-[10px] tracking-[0.12em] text-[#B5B2AB] uppercase">
          {t("waiting.participants")} ({participants.length}/{expectedCount})
        </span>

        <div className="flex flex-col gap-1.5 w-full">
          {participants.map((p) => {
            const Icon = STATUS_ICON[p.status];
            const color = STATUS_COLOR[p.status];
            const isMe = p.user_id === currentUserId;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
                  isMe ? "bg-[#FDFCF9] border border-[#D4A574]/20" : "bg-[#FDFCF9]/50"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDE9DF] text-[11px] font-medium text-[#2C2C2A]">
                  {(p.display_name || "?")[0].toUpperCase()}
                </div>
                <span className="flex-1 text-xs text-[#2C2C2A]">
                  {p.display_name || "anonymous"}
                  {isMe && <span className="ml-1 text-[#D4A574]">·</span>}
                  {p.role === "host" && (
                    <span className="ml-1 text-[9px] text-[#8A8780]">host</span>
                  )}
                </span>
                <Icon size={14} strokeWidth={1.5} className={color} />
              </div>
            );
          })}

          {/* empty slots */}
          {Array.from({ length: Math.max(0, expectedCount - participants.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 rounded-lg px-4 py-2.5 opacity-30">
              <div className="h-7 w-7 rounded-full border border-dashed border-[#DDD9D0]" />
              <span className="text-xs text-[#8A8780]">...</span>
            </div>
          ))}
        </div>
      </div>

      {/* progress */}
      <div className="flex items-center gap-2">
        {allSubmitted ? (
          <span className="text-xs tracking-wide text-[#6B8E6B]">{t("waiting.allSubmitted")}</span>
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
