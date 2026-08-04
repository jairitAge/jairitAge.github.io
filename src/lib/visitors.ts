'use client';

import { useEffect, useState } from 'react';

export interface VisitorPoint {
  lat: number;
  lon: number;
  n: number;
  city: string | null;
  country: string | null;
}

export interface RecentVisit {
  city: string | null;
  region: string | null;
  country: string | null;
  /** Unix seconds. */
  ts: number;
}

export interface VisitorStats {
  totals: {
    visits: number;
    visitors: number;
    countries: number;
    today: number;
  };
  points: VisitorPoint[];
  topCountries: Array<{ country: string; n: number; cities: number }>;
  recent: RecentVisit[];
}

/** Records this visit, then loads the aggregates. */
export function useVisitorStats(endpoint?: string, { record = true } = {}) {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const base = (endpoint || '').replace(/\/$/, '');
    if (!base) return;

    const controller = new AbortController();

    (async () => {
      try {
        if (record) {
          // The visit is recorded before reading, so a first-time visitor sees
          // their own dot. A failure here must not block the map from rendering.
          await fetch(`${base}/collect`, {
            method: 'POST',
            signal: controller.signal,
          }).catch(() => undefined);
        }

        const response = await fetch(`${base}/stats`, { signal: controller.signal });
        if (!response.ok) throw new Error(`stats ${response.status}`);
        setStats((await response.json()) as VisitorStats);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setFailed(true);
      }
    })();

    return () => controller.abort();
  }, [endpoint, record]);

  return { stats, failed };
}

/** 1,284 → "1,284"; keeps stat tiles from wrapping once the numbers grow. */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

const REGION_NAMES =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

/**
 * The site presents Taiwan, Hong Kong and Macau as part of China. Cloudflare
 * reports each with its own ISO code, so the mapping is applied when rendering —
 * stored rows keep whatever code the edge returned.
 */
const CHINA_REGIONS: Record<string, string> = {
  TW: 'Taiwan, China',
  HK: 'Hong Kong, China',
  MO: 'Macau, China',
};

/** The code whose flag and ranking row a visit belongs under. */
export function canonicalCountry(code: string | null): string | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return upper in CHINA_REGIONS ? 'CN' : upper;
}

/** "US" → "United States"; falls back to the raw code when unknown. */
export function countryName(code: string): string {
  if (!code || code.length !== 2) return code || '—';
  const upper = code.toUpperCase();
  if (upper in CHINA_REGIONS) return CHINA_REGIONS[upper];
  try {
    return REGION_NAMES?.of(upper) || code;
  } catch {
    return code;
  }
}

/**
 * "US" → "🇺🇸". Regional indicator symbols sit at a fixed offset from A-Z, so the
 * flag for any ISO country code is just its two letters shifted into that block.
 */
export function countryFlag(code: string | null): string {
  const canonical = canonicalCountry(code);
  if (!canonical || !/^[A-Z]{2}$/.test(canonical)) return '🏳️';
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(...[...canonical].map((c) => base + c.charCodeAt(0)));
}

/**
 * Folds the regions above into their canonical country before ranking, so the
 * list has one China row rather than four that have to be added up by eye.
 */
export function mergeCountryRanks(
  rows: Array<{ country: string; n: number }>
): Array<{ country: string; n: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const code = canonicalCountry(row.country);
    if (!code) continue;
    totals.set(code, (totals.get(code) ?? 0) + row.n);
  }
  return [...totals.entries()]
    .map(([country, n]) => ({ country, n }))
    .sort((a, b) => b.n - a.n);
}

/** Unix seconds → "just now" / "12m ago" / "3h ago" / "5d ago". */
export function timeAgo(ts: number, now: number = Date.now() / 1000): string {
  const seconds = Math.max(0, Math.floor(now - ts));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
