"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { RoomParticipant } from "@/types/room";
import type { TranslationKey } from "@/lib/i18n";

interface ParticipantStatusRailProps {
  code?: string;
  participants?: RoomParticipant[];
  expectedCount?: number;
  currentUserId?: string;
  leftLabel?: string;
  rightLabel?: string;
  centerLabel?: string;
  centerSubtext?: string;
  children?: ReactNode;
}

function statusKey(status?: string): TranslationKey {
  if (status === "submitted") return "status.done";
  if (status === "shooting") return "status.shooting";
  if (status === "selecting") return "status.selecting";
  return "status.ready";
}

function avatarLabel(label: string) {
  return label.trim().charAt(0).toUpperCase() || "?";
}

export default function ParticipantStatusRail({
  code,
  participants = [],
  expectedCount = 2,
  currentUserId,
  leftLabel,
  rightLabel,
  centerLabel,
  centerSubtext,
  children,
}: ParticipantStatusRailProps) {
  const { t } = useLocale();
  const me = participants.find((p) => p.user_id === currentUserId);
  const others = participants.filter((p) => p.user_id !== currentUserId);
  const partner = others[0] ?? participants.find((p) => p.role !== "host");
  const ready = participants.length >= expectedCount;

  const leftName = me?.display_name || leftLabel || t("booth.you");
  const rightName = partner?.display_name || rightLabel || t("booth.partner");

  return (
    <section className="booth-rail" aria-label="Room status">
      <div className="booth-person">
        <div className="booth-avatar">{avatarLabel(leftName)}</div>
        <div>
          <p>{leftName}</p>
          <span>{t(statusKey(me?.status))}</span>
        </div>
      </div>

      <div className="min-w-0 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#403E39]">
          {centerLabel || (code ? `${t("shell.room")} ${code}` : t("shell.privateBooth"))}
          {code && <Lock size={11} strokeWidth={1.5} className="text-[#AFA79B]" />}
        </p>
        <p className="mt-0.5 text-[11px] text-[#8A8780]">
          {centerSubtext || (ready ? t("waiting.bothReady") : t("waiting.invitePartner"))}
        </p>
        {children}
      </div>

      <div className="booth-person justify-end text-right">
        <div>
          <p>{rightName}</p>
          <span>{t(statusKey(partner?.status))}</span>
        </div>
        <div className="booth-avatar">{avatarLabel(rightName)}</div>
      </div>
    </section>
  );
}
