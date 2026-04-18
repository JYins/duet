import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#F5F2EA] px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-serif text-4xl font-light italic text-[#2C2C2A]">
          lost
        </h1>
        <p className="text-sm text-[#8A8780]">
          this page doesn't exist
        </p>
        <Link
          href="/"
          className="rounded-full border border-[#DDD9D0] px-5 py-2 text-xs tracking-wide text-[#2C2C2A] transition-all hover:border-[#D4A574]"
        >
          back home
        </Link>
      </div>
    </main>
  );
}
