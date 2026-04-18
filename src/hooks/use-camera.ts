"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { getStream, stopStream, type FacingMode } from "@/lib/camera";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<FacingMode>("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (mode: FacingMode = "user") => {
    try {
      // stop any existing stream first
      if (streamRef.current) stopStream(streamRef.current);

      const stream = await getStream(mode);
      streamRef.current = stream;
      setFacing(mode);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "camera access denied");
      setReady(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    setReady(false);
  }, []);

  const flip = useCallback(() => {
    const next = facing === "user" ? "environment" : "user";
    start(next);
  }, [facing, start]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) stopStream(streamRef.current);
    };
  }, []);

  return { videoRef, ready, error, facing, start, stop, flip };
}
