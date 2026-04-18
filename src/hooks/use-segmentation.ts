"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SegmentationEngine } from "@/lib/segmentation";

export function useSegmentation() {
  const engineRef = useRef<SegmentationEngine | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [runtime, setRuntime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    if (engineRef.current) return;
    setLoading(true);
    setError(null);

    try {
      // dynamic import to avoid SSR issues with browser-only APIs
      const { getSegmenter } = await import("@/lib/segmentation");
      const engine = await getSegmenter();
      engineRef.current = engine;
      setRuntime(engine.runtime);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load segmenter");
    } finally {
      setLoading(false);
    }
  }, []);

  const segment = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement): Promise<ImageData> => {
      if (!engineRef.current) throw new Error("segmenter not initialized");
      return engineRef.current.segment(source);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  return { init, segment, loading, ready, runtime, error };
}
