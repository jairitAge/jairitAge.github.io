'use client';

import Link from 'next/link';
import VisitorMap from './VisitorMap';
import { formatCount, useVisitorStats } from '@/lib/visitors';
import { useMessages } from '@/lib/i18n/useMessages';

/**
 * Compact map for the footer. This is the component that records the visit — it
 * sits on every page, whereas /visitors only sees people who go looking for it.
 * The tooltip is off here: the whole block is a link to the full dashboard.
 */
export default function FooterVisitorMap({ endpoint }: { endpoint: string }) {
  const messages = useMessages();
  const { stats, failed } = useVisitorStats(endpoint);

  // Nothing to show yet, or the backend is down: render nothing rather than
  // leave a bare heading over an empty box.
  if (failed || !stats || stats.points.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 mb-4">
      <p className="text-xs text-neutral-500">{messages.footer.visitors}</p>
      <Link
        href="/visitors"
        className="w-full max-w-[800px] rounded-lg transition-opacity hover:opacity-90"
        aria-label={messages.visitors.title}
      >
        <VisitorMap points={stats.points} />
      </Link>
      <p className="text-xs text-neutral-500">
        <span className="tabular-nums">{formatCount(stats.totals.visits)}</span> {messages.visitors.visitsFrom}{' '}
        <span className="tabular-nums">{formatCount(stats.totals.cities)}</span> {messages.visitors.citiesSuffix}
      </p>
    </div>
  );
}
