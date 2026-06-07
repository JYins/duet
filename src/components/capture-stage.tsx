"use client";

import { forwardRef, type ReactNode } from "react";
import { Loader2, Users } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import CountdownOverlay from "./countdown-overlay";
import ShutterFlash from "./shutter-flash";

interface CaptureStageProps {
  cssFilter?: string;
  ready?: boolean;
  loading?: boolean;
  error?: string | null;
  count?: number | null;
  flash?: boolean;
  lastCapture?: ReactNode;
  overlay?: ReactNode;
  hint?: string;
  mirrored?: boolean;
}

const CaptureStage = forwardRef<HTMLVideoElement, CaptureStageProps>(
  function CaptureStage(
    {
      cssFilter,
      ready = true,
      loading = false,
      error,
      count,
      flash = false,
      lastCapture,
      overlay,
      hint,
      mirrored = true,
    },
    ref,
  ) {
    const { t } = useLocale();

    return (
      <section className="capture-card">
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
          style={cssFilter && cssFilter !== "none" ? { filter: cssFilter } : undefined}
        />
        {overlay}
        <CountdownOverlay count={count ?? null} />
        <ShutterFlash flash={flash} />
        {lastCapture}
        {hint && (
          <div className="capture-hint">
            <Users size={16} strokeWidth={1.5} />
            {hint}
          </div>
        )}
        {(loading || !ready || error) && (
          <div className="capture-mask">
            {error ? (
              <p className="max-w-[18rem] text-center text-[12px] leading-5 text-white/85">
                {error}
              </p>
            ) : (
              <>
                <Loader2 size={22} className="animate-spin text-white/85" />
                <p className="text-[11px] tracking-wide text-white/65">{t("booth.preparingCamera")}</p>
              </>
            )}
          </div>
        )}
      </section>
    );
  },
);

export default CaptureStage;
