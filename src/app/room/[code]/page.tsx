"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useSessionId } from "@/hooks/use-session-id";
import { findRoom } from "@/lib/rooms";
import type { Room } from "@/types/room";
import BoothShell from "@/components/booth-shell";
import AsyncFlow from "./async-flow";
import GhostFlow from "./ghost-flow";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const { t } = useLocale();
  const sessionId = useSessionId();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const found = await Promise.race([
          findRoom(params.code),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (cancelled) return;
        if (!found) {
          setError(t("room.notFound"));
        } else {
          setRoom(found);
        }
      } catch {
        if (!cancelled) setError(t("room.notFound"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.code, t]);

  return (
    <BoothShell code={room?.short_code} eyebrow={room ? t("room.joining") : undefined}>
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 size={22} className="animate-spin text-[#8A8780]" />
          <p className="text-xs tracking-wide text-[#8A8780]">{t("room.joining")}</p>
        </div>
      )}

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-[#2C2C2A]">{error}</p>
          <Link
            href="/"
            className="rounded-full border border-[#DDD9D0] px-5 py-2 text-xs text-[#2C2C2A] hover:bg-[#EDE9DF]"
          >
            {t("room.backHome")}
          </Link>
        </div>
      )}

      {room && !loading && !error && (
        room.mode === "ghost" ? (
          <GhostFlow room={room} sessionId={sessionId} />
        ) : (
          <AsyncFlow room={room} sessionId={sessionId} />
        )
      )}
    </BoothShell>
  );
}
