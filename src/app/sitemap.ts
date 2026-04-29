import type { MetadataRoute } from 'next';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getConfig();
  const base = (config.site.url || 'https://jairitAge.github.io').replace(/\/$/, '');
  const now = new Date();

  const routes = [
    '/',
    ...config.navigation
      .filter((nav) => nav.type === 'page' && nav.target !== 'about')
      .map((nav) => `/${nav.target}/`),
  ];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1.0 : 0.7,
  }));
}
