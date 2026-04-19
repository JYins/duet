"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useSessionId } from "@/hooks/use-session-id";
import { findRoom } from "@/lib/rooms";
import type { Room } from "@/types/room";
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
    async function load() {
      const found = await findRoom(params.code);
      if (!found) {
        setError(t("room.notFound"));
      } else {
        setRoom(found);
      }
      setLoading(false);
    }
    load();
  }, [params.code]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[#F5F2EA]">
      <header className="flex w-full max-w-lg items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-3 sm:px-6 sm:pt-8">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-base italic text-[#2C2C2A]/40 sm:text-lg">
          Duet
        </motion.span>
        {room && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-[10px] tracking-wider text-[#D4A574] uppercase">
            {room.short_code}
          </motion.span>
        )}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#8A8780]" />
            <p className="text-xs tracking-wide text-[#8A8780]">{t("room.joining")}</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-[#2C2C2A]">{error}</p>
            <a href="/" className="rounded-full border border-[#DDD9D0] px-5 py-2 text-xs text-[#2C2C2A] hover:bg-[#EDE9DF]">
              {t("room.backHome")}
            </a>
          </div>
        )}

        {room && !loading && !error && (
          <>
            {room.mode === "ghost" ? (
              <GhostFlow room={room} sessionId={sessionId} />
            ) : (
              <AsyncFlow room={room} sessionId={sessionId} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
