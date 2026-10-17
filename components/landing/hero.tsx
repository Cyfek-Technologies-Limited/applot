import Image from 'next/image'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-16 lg:px-14 lg:py-8">
      <div className="flex max-w-2xl flex-col lg:flex-1">
        <h1 className="text-balance font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl xl:text-7xl">
          Upload once, apply everywhere
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-foreground/85 sm:text-xl">
          Applot finds legit roles on trusted job boards, tailors every application to your CV, and
          sends up to 100 a day while you prepare for interviews.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex h-14 min-w-40 items-center justify-center rounded-full bg-gradient-to-r from-primary to-[#e8007a] px-8 text-base font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/60 transition-transform hover:scale-[1.02]"
          >
            Get started
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex h-14 min-w-40 items-center justify-center rounded-full bg-foreground px-8 text-base font-semibold text-background transition-opacity hover:opacity-90"
          >
            Learn more
          </Link>
        </div>
      </div>
    </section>
  )
}

export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 md:left-auto md:w-[62%]">
        <Image
          src="/images/hero-robot-bg.png"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 62vw, 100vw"
          className="object-cover object-[68%_center] opacity-40 md:object-[75%_center] md:opacity-100"
        />
        <div className="absolute inset-0 bg-background/40 md:hidden" />
        <div className="absolute inset-y-0 left-0 hidden w-2/5 bg-gradient-to-r from-background via-background/70 to-transparent md:block" />
        <div className="absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l from-background via-background/50 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/80 to-transparent" />
    </div>
  )
}
