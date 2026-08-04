'use client';

import { usePathname } from 'next/navigation';
import { useLocaleStore } from '@/lib/stores/localeStore';
import { useMessages } from '@/lib/i18n/useMessages';
import type { SiteConfig } from '@/lib/config';
import FooterVisitorMap from '@/components/visitors/FooterVisitorMap';

interface FooterProps {
  lastUpdated?: string;
  lastUpdatedByLocale?: Record<string, string | undefined>;
  defaultLocale?: string;
  visitors?: SiteConfig['visitors'];
}

export default function Footer({ lastUpdated, lastUpdatedByLocale, defaultLocale = 'en', visitors }: FooterProps) {
  const locale = useLocaleStore((state) => state.locale);
  const messages = useMessages();
  const pathname = usePathname();

  // /visitors already leads with a full-size map; a second one in the footer of
  // that page is just the same data twice.
  const onVisitorsPage = pathname?.replace(/\/$/, '') === '/visitors';
  const endpoint =
    visitors?.enabled === false || onVisitorsPage ? '' : (visitors?.endpoint || '').trim();

  const resolvedLastUpdated =
    lastUpdatedByLocale?.[locale] ||
    (defaultLocale ? lastUpdatedByLocale?.[defaultLocale] : undefined) ||
    lastUpdated ||
    new Date().toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <footer className="border-t border-neutral-200/50 bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-700/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {endpoint && <FooterVisitorMap endpoint={endpoint} />}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-neutral-500">
            {messages.footer.lastUpdated}: {resolvedLastUpdated}
          </p>
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Qianxu Wang
          </p>
        </div>
      </div>
    </footer>
  );
}
