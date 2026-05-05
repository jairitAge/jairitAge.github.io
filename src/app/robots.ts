import type { MetadataRoute } from 'next';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const config = getConfig();
  const base = (config.site.url || 'https://jairitage.github.io').replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
