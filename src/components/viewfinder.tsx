"use client";

import { forwardRef } from "react";

// live camera preview with 3:4 aspect ratio crop
const Viewfinder = forwardRef<HTMLVideoElement>(function Viewfinder(_, ref) {
  return (
    <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg bg-[#2C2C2A]">
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
