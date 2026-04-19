"use client";

import { forwardRef } from "react";

interface ViewfinderProps {
  cssFilter?: string;
}

// live camera preview — 3:4 aspect ratio, responsive width
const Viewfinder = forwardRef<HTMLVideoElement, ViewfinderProps>(
  function Viewfinder({ cssFilter }, ref) {
    return (
      <div className="relative aspect-[3/4] w-full max-w-[min(340px,80vw)] overflow-hidden rounded-lg bg-[#2C2C2A] sm:max-w-sm">
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover -scale-x-100"
          style={cssFilter && cssFilter !== "none" ? { filter: cssFilter } : undefined}
        />
      </div>
    );
  },
);

export default Viewfinder;
