import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-6 pb-16 pt-24 lg:px-14 lg:pb-20">
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-balance font-display text-5xl font-medium leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Upload once, apply everywhere
        </h1>
        <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Applot finds legit roles on trusted job boards, tailors every
          application to your CV, and sends up to 100 a day while you prepare
          for interviews.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/sign-up"
            className="inline-flex h-14 min-w-36 items-center justify-center rounded-full bg-gradient-to-r from-primary to-[#e8007a] px-8 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/60 transition-transform hover:scale-[1.02]"
          >
            Get started
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex h-14 min-w-36 items-center justify-center rounded-full bg-foreground px-8 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Learn more
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <Image
        src="/images/hero-robot.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[70%_center] opacity-45 md:opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40 md:via-background/75 md:to-background/35" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
