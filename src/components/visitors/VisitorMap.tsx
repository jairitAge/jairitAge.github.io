'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LAND_LAT_MAX,
  LAND_LAT_MIN,
  LAND_LON_MIN,
  LAND_MASK_COLS,
  LAND_MASK_ROWS,
  getLandMask,
  isLand,
} from '@/lib/landMask';
import type { VisitorPoint } from '@/lib/visitors';
import { countryName, formatCount } from '@/lib/visitors';

/**
 * The map carries its own deep-navy surface in both themes rather than following
 * the page. The gold visitor dots clear 3:1 against it, which they cannot do
 * against the light theme's near-white background.
 */
const SURFACE = '#1e293b';
const LAND_DOT = '#475569';
const VISITOR_DOT = '#d4a562';

const LON_SPAN = 360;
const LAT_SPAN = LAND_LAT_MAX - LAND_LAT_MIN;
export const MAP_ASPECT = LAND_MASK_COLS / LAND_MASK_ROWS;

/** Dots stay small enough for a dense map; the hover target below is far larger. */
const MIN_RADIUS = 1.8;
const MAX_RADIUS = 5.2;
const HOVER_RADIUS = 12;

function project(lat: number, lon: number, width: number, height: number) {
  const clampedLat = Math.max(LAND_LAT_MIN, Math.min(LAND_LAT_MAX, lat));
  return {
    x: ((lon - LAND_LON_MIN) / LON_SPAN) * width,
    y: ((LAND_LAT_MAX - clampedLat) / LAT_SPAN) * height,
  };
}

interface VisitorMapProps {
  points: VisitorPoint[];
  /** Enables the hover tooltip. Off for the footer, where the map is a link. */
  interactive?: boolean;
  className?: string;
}

export default function VisitorMap({ points, interactive = false, className = '' }: VisitorMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<{ point: VisitorPoint; x: number; y: number } | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setSize({ width, height: width / MAP_ASPECT });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Largest dot count drives the radius scale, so a quiet map still shows relief.
  const maxCount = points.reduce((max, point) => Math.max(max, point.n), 1);

  const radiusFor = useCallback(
    (count: number, scale: number) => {
      // Area-proportional: perceived size should track the visit count, and sqrt
      // is what keeps a 100-visit dot from swamping a 1-visit dot.
      const t = Math.sqrt(count) / Math.sqrt(maxCount);
      return (MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t) * scale;
    },
    [maxCount]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const { width, height } = size;
    if (!canvas || width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = SURFACE;
    ctx.fillRect(0, 0, width, height);

    // Land: a recessive dot grid, one dot per degree of the generated mask.
    const mask = getLandMask();
    const stepX = width / LAND_MASK_COLS;
    const stepY = height / LAND_MASK_ROWS;
    const landRadius = Math.max(0.35, Math.min(stepX, stepY) * 0.3);

    ctx.fillStyle = LAND_DOT;
    for (let row = 0; row < LAND_MASK_ROWS; row++) {
      for (let col = 0; col < LAND_MASK_COLS; col++) {
        if (!isLand(mask, col, row)) continue;
        ctx.beginPath();
        ctx.arc((col + 0.5) * stepX, (row + 0.5) * stepY, landRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Visitors: smallest first, so a busy city is never hidden under a quiet one.
    const ordered = [...points].sort((a, b) => a.n - b.n);
    const scale = Math.max(0.55, Math.min(1.4, width / 900));

    for (const point of ordered) {
      const { x, y } = project(point.lat, point.lon, width, height);
      const radius = radiusFor(point.n, scale);

      // A 2px surface ring keeps overlapping dots readable as separate marks.
      ctx.beginPath();
      ctx.arc(x, y, radius + 1.6, 0, Math.PI * 2);
      ctx.fillStyle = SURFACE;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = VISITOR_DOT;
      ctx.fill();
    }
  }, [points, size, radiusFor]);

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive || size.width === 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      let best: { point: VisitorPoint; x: number; y: number } | null = null;
      let bestDistance = HOVER_RADIUS;

      for (const point of points) {
        const { x, y } = project(point.lat, point.lon, size.width, size.height);
        const distance = Math.hypot(x - mouseX, y - mouseY);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { point, x, y };
        }
      }

      setHovered(best);
    },
    [interactive, points, size]
  );

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: size.height ? `${size.height}px` : undefined }}
        className="block rounded-lg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHovered(null)}
        role="img"
        aria-label={`Visitor map with ${points.length} locations`}
      />
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-neutral-900/95 px-2 py-1 text-xs text-white shadow-lg dark:bg-neutral-800/95"
          style={{ left: hovered.x, top: hovered.y - 8 }}
        >
          <span className="font-medium">
            {hovered.point.city || (hovered.point.country ? countryName(hovered.point.country) : 'Unknown')}
          </span>
          {hovered.point.city && hovered.point.country && (
            <span className="text-neutral-300">, {countryName(hovered.point.country)}</span>
          )}
          <span className="ml-1.5 tabular-nums text-neutral-300">{formatCount(hovered.point.n)}</span>
        </div>
      )}
    </div>
  );
}
