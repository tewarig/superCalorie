import Link from "next/link";

import { TodayCard } from "@/components/today-card";

const FEATURES = [
  {
    title: "Log in seconds",
    body: "Quick-add favourites, recent meals, and portions that make sense. No forms with twelve fields.",
    accent: "bg-tangerine-soft text-tangerine",
    symbol: "01",
  },
  {
    title: "Yours, and offline",
    body: "Everything is stored on your device and works with no account and no connection. Export any time as JSON or CSV.",
    accent: "bg-mint text-leaf-deep",
    symbol: "02",
  },
  {
    title: "Honest numbers",
    body: "Calories and macros without gamified guilt. A gentle ring, a daily goal, and that's it.",
    accent: "bg-parchment text-ink-soft",
    symbol: "03",
  },
];

export default function Home() {
  return (
    <div className="grain flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">
          super<span className="text-tangerine">Calorie</span>
        </p>
        <nav className="flex items-center gap-6 text-sm font-medium text-ink-soft">
          <a className="transition-colors hover:text-ink" href="#features">
            Features
          </a>
          <Link
            className="rounded-full bg-ink px-4 py-2 font-semibold text-cream transition-colors hover:bg-leaf-deep"
            href="/today"
          >
            Open the app
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <p className="rise mb-5 inline-block rounded-full border border-sand bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Web · iOS · Android
            </p>
            <h1
              className="rise font-display text-ink"
              style={{
                fontSize: "clamp(2.75rem, 6vw, 4.5rem)",
                lineHeight: 1.04,
                fontWeight: 560,
                animationDelay: "80ms",
              }}
            >
              Eat well.
              <br />
              Counted{" "}
              <em className="text-leaf" style={{ fontVariationSettings: "'SOFT' 60, 'WONK' 1" }}>
                simply
              </em>
              .
            </h1>
            <p
              className="rise mt-6 max-w-md text-lg leading-relaxed text-ink-soft"
              style={{ animationDelay: "160ms" }}
            >
              superCalorie is a calm calorie tracker. Log a meal in seconds, see one honest
              number, and get on with your day — on every device you own.
            </p>
            <div
              className="rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                className="rounded-full bg-leaf px-7 py-3.5 font-semibold text-cream transition-all hover:-translate-y-0.5 hover:bg-leaf-deep"
                href="/today"
              >
                Start tracking — no account needed
              </Link>
              <a
                className="rounded-full border border-ink px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-parchment"
                href="#features"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="rise" style={{ animationDelay: "200ms" }}>
            <TodayCard />
          </div>
        </section>

        <section id="features" className="border-t border-sand bg-parchment/60">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Tracking that stays out of your way
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-sand bg-white p-7 transition-transform hover:-translate-y-1"
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-semibold ${feature.accent}`}
                  >
                    {feature.symbol}
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-ink-faint">
          <p>
            © {new Date().getFullYear()} superCalorie — a Turborepo of Expo, Next.js, and one
            shared design system.
          </p>
          <p className="font-mono text-xs">apps/web · apps/mobile · packages/ui</p>
        </div>
      </footer>
    </div>
  );
}
