'use client';

import { useEffect, useState } from 'react';

export interface VisitorPoint {
  lat: number;
  lon: number;
  n: number;
  city: string | null;
  country: string | null;
}

export interface VisitorStats {
  totals: {
    visits: number;
    visitors: number;
    countries: number;
    cities: number;
    today: number;
  };
  points: VisitorPoint[];
  topCountries: Array<{ country: string; n: number; cities: number }>;
  topCities: Array<{ city: string; country: string | null; n: number }>;
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
