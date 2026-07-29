import { MEAL_LABELS, buildPublicStats, formatDateLabel } from "@supercalorie/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heatmap } from "@/components/heatmap";
import { entries, profiles, users } from "@/lib/repo";

/**
 * Someone's shareable page. No authentication: this is the one part of the
 * app meant to be handed to other people.
 *
 * It reads the database directly rather than fetching its own API, which
 * avoids a round trip on render — the visibility rules live in
 * buildPublicStats, so both paths enforce the same thing.
 */

interface Props {
  params: Promise<{ handle: string }>;
}

function load(handle: string) {
  const profile = profiles.byHandle(handle);
  if (!profile || !profile.isPublic) return null;

  const owner = users.byId(profile.userId);
  /* v8 ignore next -- a profile cascade-deletes with its user. */
  if (!owner) return null;

  return {
    profile,
    stats: buildPublicStats(entries.all(profile.userId), owner.dailyCalorieGoal, profile),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const found = load(handle);
  if (!found) return { title: "Not found — superCalorie" };

  return {
    title: `${found.profile.displayName} — superCalorie`,
    description: found.profile.bio ?? `${found.profile.displayName} on superCalorie.`,
    // A hidden profile must not be indexed if it is later made public and
    // then private again.
    robots: { index: true, follow: true },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  const found = load(handle);

  // A private profile and a handle nobody has claimed look identical, so
  // this cannot be used to discover which accounts exist.
  if (!found) notFound();

  const { profile, stats } = found;
  const nothingShown = Object.keys(stats).length === 0;

  return (
    <div className="grain min-h-screen">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          super<span className="text-tangerine">Calorie</span>
        </Link>
        <Link
          href="/today"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-leaf-deep"
        >
          Start your own
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-20">
        <section className="flex items-center gap-5 rounded-3xl border border-sand bg-white p-6">
          {profile.avatarPhotoId ? (
            /* eslint-disable-next-line @next/next/no-img-element -- served by our own route, not a static asset */
            <img
              src={`/api/public/${profile.handle}/avatar`}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full border border-sand object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-mint font-display text-2xl font-semibold text-leaf-deep">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold text-ink">{profile.displayName}</h1>
            <p className="text-sm text-ink-faint">@{profile.handle}</p>
            {profile.bio && <p className="mt-2 text-ink-soft">{profile.bio}</p>}
          </div>
        </section>

        {nothingShown && (
          <p className="mt-6 rounded-2xl border border-sand bg-white p-6 text-center text-ink-soft">
            This profile is public but hasn&apos;t shared any details yet.
          </p>
        )}

        {stats.today && (
          <section className="mt-6 rounded-2xl border border-sand bg-white p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Today
            </h2>
            <p className="mt-2 font-display text-4xl font-semibold text-ink">
              {stats.today.calories}
              <span className="ml-2 text-lg font-normal text-ink-faint">
                / {stats.today.goal} kcal
              </span>
            </p>
          </section>
        )}

        {stats.totals && (
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Days logged", stats.totals.days],
              ["Entries", stats.totals.entries],
              ["Total kcal", stats.totals.calories.toLocaleString()],
              ["Streak", `${stats.totals.currentStreak}d`],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-2xl border border-sand bg-white p-4 text-center"
              >
                <p className="font-display text-2xl font-semibold text-ink">{value}</p>
                <p className="mt-1 text-xs text-ink-faint">{label}</p>
              </div>
            ))}
          </section>
        )}

        {stats.heatmap && (
          <section className="mt-6 rounded-2xl border border-sand bg-white p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              The last year
            </h2>
            <Heatmap days={stats.heatmap} />
          </section>
        )}

        {stats.topFoods && stats.topFoods.length > 0 && (
          <section className="mt-6 rounded-2xl border border-sand bg-white p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Most eaten
            </h2>
            <ol className="mt-3 divide-y divide-sand">
              {stats.topFoods.map((food, index) => (
                <li key={food.name} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 shrink-0 text-sm tabular-nums text-ink-faint">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{food.name}</span>
                  <span className="shrink-0 text-sm text-ink-faint">
                    {food.count}× · {food.calories.toLocaleString()} kcal
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {stats.recent && stats.recent.length > 0 && (
          <section className="mt-6 rounded-2xl border border-sand bg-white p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Recently
            </h2>
            <ul className="mt-3 divide-y divide-sand">
              {stats.recent.map((item, index) => (
                <li key={`${item.date}-${index}`} className="flex items-baseline gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.name}</span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {MEAL_LABELS[item.meal]} · {formatDateLabel(item.date)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {item.calories}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
