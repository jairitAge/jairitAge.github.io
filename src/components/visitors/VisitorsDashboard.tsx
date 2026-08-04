'use client';

import { motion } from 'framer-motion';
import VisitorMap from './VisitorMap';
import type { RecentVisit } from '@/lib/visitors';
import { countryFlag, countryName, formatCount, timeAgo, useVisitorStats } from '@/lib/visitors';
import { useMessages } from '@/lib/i18n/useMessages';

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs text-neutral-500">{label}</div>
      {/* Proportional figures: these are standalone display numbers, not a column. */}
      <div className="mt-1 text-2xl font-semibold text-primary">{formatCount(value)}</div>
    </div>
  );
}

/** Horizontal ranking bar. Long place names are why this is horizontal, not a column chart. */
function RankRow({ label, sub, value, max }: { label: string; sub?: string; value: number; max: number }) {
  const percent = max > 0 ? Math.max(2, (value / max) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* The neutral scale is inverted for dark mode, so these tokens are already
          theme-correct — adding a dark: override here would flip them the wrong way. */}
      <div className="w-40 shrink-0 truncate text-sm text-neutral-700" title={label}>
        {label}
        {sub && <span className="ml-1 text-xs text-neutral-500">{sub}</span>}
      </div>
      <div className="h-2.5 flex-1 rounded-full bg-neutral-200">
        <div className="h-full rounded-r-[4px] bg-primary dark:bg-accent" style={{ width: `${percent}%` }} />
      </div>
      {/* Tabular figures here: this is a column of numbers that must line up. */}
      <div className="w-14 shrink-0 text-right text-sm tabular-nums text-neutral-600 dark:text-neutral-500">
        {formatCount(value)}
      </div>
    </div>
  );
}

/** One line of the recent-visitors feed: flag, where, how long ago. */
function RecentRow({ visit, unknown }: { visit: RecentVisit; unknown: string }) {
  const place = [visit.city, visit.region, visit.country ? countryName(visit.country) : null]
    // A visit often repeats the city as its region ("Beijing, Beijing"); drop the echo.
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(', ');

  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 py-2 last:border-b-0">
      <span className="w-6 shrink-0 text-center text-base leading-none" aria-hidden="true">
        {countryFlag(visit.country)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{place || unknown}</span>
      <span className="shrink-0 text-xs tabular-nums text-neutral-500">{timeAgo(visit.ts)}</span>
    </div>
  );
}

export default function VisitorsDashboard({ endpoint }: { endpoint?: string }) {
  const messages = useMessages();
  const labels = messages.visitors;
  const { stats, failed } = useVisitorStats(endpoint);

  if (!endpoint) return null;

  if (failed) {
    return <p className="py-8 text-sm text-neutral-500">{labels.unavailable}</p>;
  }

  if (!stats) {
    return (
      <div className="py-8">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  const maxCountry = stats.topCountries[0]?.n ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label={labels.totalVisits} value={stats.totals.visits} />
        <StatTile label={labels.uniqueVisitors} value={stats.totals.visitors} />
        <StatTile label={labels.today} value={stats.totals.today} />
        <StatTile label={labels.countries} value={stats.totals.countries} />
        <StatTile label={labels.cities} value={stats.totals.cities} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-primary">{labels.mapTitle}</h2>
        <VisitorMap points={stats.points} interactive />
        <p className="mt-2 text-xs text-neutral-500">{labels.mapNote}</p>
      </section>

      {/* Countries and the recent feed sit side by side: one ranking on its own
          would stretch a 40-character label row across the full page width. */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-primary">{labels.topCountries}</h2>
          {stats.topCountries.length === 0 ? (
            <p className="text-sm text-neutral-500">{labels.empty}</p>
          ) : (
            stats.topCountries.map((row) => (
              <RankRow
                key={row.country}
                label={countryName(row.country)}
                value={row.n}
                max={maxCountry}
              />
            ))
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-primary">{labels.recentVisitors}</h2>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-neutral-500">{labels.empty}</p>
          ) : (
            <div className="rounded-xl border border-neutral-200 px-4 py-1">
              {stats.recent.map((visit, index) => (
                <RecentRow key={`${visit.ts}-${index}`} visit={visit} unknown={labels.unknownLocation} />
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
