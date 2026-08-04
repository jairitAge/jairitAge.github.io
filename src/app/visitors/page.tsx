import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import VisitorsPageClient from '@/components/visitors/VisitorsPageClient';

export function generateMetadata(): Metadata {
  const config = getConfig();
  // The root layout appends "| <site title>", so this is just the leaf name.
  return {
    title: 'Visitors',
    description: `Where the visitors of ${config.site.title} come from.`,
  };
}

export default function VisitorsPage() {
  const config = getConfig();
  const visitors = config.visitors;

  if (visitors?.enabled === false || !visitors?.endpoint) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-serif font-bold text-primary mb-4">Visitors</h1>
        <p className="text-neutral-600 dark:text-neutral-500">
          The visitor map is not configured yet.
        </p>
      </div>
    );
  }

  return <VisitorsPageClient endpoint={visitors.endpoint} />;
}
