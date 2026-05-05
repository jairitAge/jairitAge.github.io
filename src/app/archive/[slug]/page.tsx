import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPageConfig, getArchiveBody } from '@/lib/content';
import { ArchivePageConfig } from '@/types/page';
import ArchiveDetail from '@/components/pages/ArchiveDetail';

function loadArchiveItems(): ArchivePageConfig['items'] {
  const config = getPageConfig<ArchivePageConfig>('archive');
  return config?.items || [];
}

export function generateStaticParams() {
  return loadArchiveItems()
    .filter((item) => Boolean(item.slug))
    .map((item) => ({ slug: item.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = loadArchiveItems().find((entry) => entry.slug === slug);
  if (!item) {
    return {};
  }
  return {
    title: item.title,
    description: item.summary,
  };
}

export default async function ArchiveEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = loadArchiveItems().find((entry) => entry.slug === slug);

  if (!item) {
    notFound();
  }

  const body = getArchiveBody(slug);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <ArchiveDetail item={item} body={body} />
    </div>
  );
}
