import Image from 'next/image'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:justify-between lg:gap-12 lg:px-14 lg:py-8">
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

      <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10 sm:max-w-lg lg:w-[42%] lg:max-w-xl">
        <Image
          src="/images/hero-orbs.png"
          alt="Abstract glass fins and softly lit spheres on a cool blue gradient"
          fill
          priority
          sizes="(min-width: 1024px) 42vw, 512px"
          className="object-cover object-center"
        />
      </div>
    </section>
  )
}
