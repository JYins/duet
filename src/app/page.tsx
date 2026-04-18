import Link from "next/link";
import { Camera } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#F5F2EA] px-6">
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-5xl font-light tracking-tight text-[#2C2C2A]">
          duet
        </h1>
        <p className="max-w-xs text-base leading-relaxed text-[#2C2C2A]/60">
          take photos together, even when you are apart
        </p>
        <Link
          href="/booth"
          className="flex items-center gap-2 rounded-full bg-[#2C2C2A] px-6 py-3 text-sm text-[#F5F2EA] transition-opacity hover:opacity-80"
        >
          <Camera size={16} />
          start shooting
        </Link>
      </div>
    </main>
  );
}
