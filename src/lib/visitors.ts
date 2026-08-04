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

/** "US" → "United States"; falls back to the raw code when unknown. */
export function countryName(code: string): string {
  if (!code || code.length !== 2) return code || '—';
  try {
    return REGION_NAMES?.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/**
 * "US" → "🇺🇸". Regional indicator symbols sit at a fixed offset from A-Z, so the
 * flag for any ISO country code is just its two letters shifted into that block.
 */
export function countryFlag(code: string | null): string {
  if (!code || code.length !== 2 || !/^[a-z]{2}$/i.test(code)) return '🏳️';
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => base + c.charCodeAt(0)));
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
