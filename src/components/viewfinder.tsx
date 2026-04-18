"use client";

import { forwardRef } from "react";

// live camera preview — 3:4 aspect ratio, responsive width
const Viewfinder = forwardRef<HTMLVideoElement>(function Viewfinder(_, ref) {
  return (
    <div className="relative aspect-[3/4] w-full max-w-[min(340px,80vw)] overflow-hidden rounded-lg bg-[#2C2C2A] sm:max-w-sm">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover -scale-x-100"
      />
    </div>
  );
});

export default Viewfinder;
