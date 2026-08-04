/**
 * Visitor map backend.
 *
 * Two routes:
 *   POST /collect  records the current visit, geolocated from Cloudflare's edge
 *   GET  /stats    returns the aggregates the footer widget and /visitors render
 *
 * Location comes from `request.cf`, which Cloudflare fills in for free on every
 * plan, so there is no third-party IP-geolocation API to rate-limit us or shut
 * down. Raw IPs are never stored: visitors are identified by a salted hash.
 */

export interface Env {
  DB: D1Database;
  /** Comma-separated list of origins allowed to call this Worker. */
  ALLOWED_ORIGINS: string;
  /** Secret used to salt visitor hashes. Set with `wrangler secret put VISITOR_SALT`. */
  VISITOR_SALT: string;
}

/** A repeat visit within this window is treated as the same session, not a new hit. */
const SESSION_WINDOW_SECONDS = 30 * 60;

/** Caps on what /stats returns, so one popular city cannot balloon the payload. */
const MAX_POINTS = 2000;
const MAX_RANKS = 20;
/** Length of the "recent visitors" feed. */
const MAX_RECENT = 15;

/** How long browsers and the edge may reuse a /stats response. */
const STATS_CACHE_SECONDS = 60;

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, origin: string | null, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin), ...extra },
  });
}

/**
 * Stable per-visitor identifier: a salted hash of IP + user agent. The salt is a
 * Worker secret, so the hash cannot be reversed into an IP by anyone reading the
 * database, and the IP itself is never written down.
 */
async function visitorId(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const data = new TextEncoder().encode(`${env.VISITOR_SALT}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function collect(request: Request, env: Env, origin: string | null): Promise<Response> {
  const cf = request.cf as IncomingRequestCfProperties | undefined;
  const lat = cf?.latitude ? Number(cf.latitude) : null;
  const lon = cf?.longitude ? Number(cf.longitude) : null;

  // Without coordinates there is nothing to plot, so don't spend a write on it.
  if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
    return json({ ok: false, reason: 'no-geo' }, origin);
  }

  const vid = await visitorId(request, env);
  const now = Math.floor(Date.now() / 1000);

  // Session dedup and the insert are one statement on purpose. Checking with a
  // separate SELECT lets two concurrent requests from the same visitor both see
  // "no recent hit" and both insert, double-counting the visit.
  const result = await env.DB.prepare(
    `INSERT INTO hits (vid, ts, day, lat, lon, city, region, country)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
     WHERE NOT EXISTS (SELECT 1 FROM hits WHERE vid = ?1 AND ts > ?9)`
  )
    .bind(
      vid,
      now,
      new Date(now * 1000).toISOString().slice(0, 10),
      lat,
      lon,
      cf?.city ?? null,
      cf?.region ?? null,
      cf?.country ?? null,
      now - SESSION_WINDOW_SECONDS
    )
    .run();

  return json({ ok: true, deduped: (result.meta?.changes ?? 0) === 0 }, origin);
}

async function stats(env: Env, origin: string | null): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);

  const [totals, todayRow, points, countries, recent] = await env.DB.batch<Record<string, unknown>>([
    // TW/HK/MO fold into CN to match how the site presents them; see
    // CHINA_REGIONS in src/lib/visitors.ts, which does the same for the
    // ranking and the flags. Stored rows keep the code the edge returned.
    env.DB.prepare(
      `SELECT COUNT(*) AS visits,
              COUNT(DISTINCT vid) AS visitors,
              COUNT(DISTINCT CASE WHEN country IN ('TW','HK','MO') THEN 'CN' ELSE country END) AS countries
       FROM hits`
    ),
    env.DB.prepare('SELECT COUNT(*) AS visits FROM hits WHERE day = ?1').bind(today),
    // Coordinates are rounded to ~11km before grouping: it collapses a city into
    // one dot and means the response never carries a precise visitor location.
    env.DB.prepare(
      `SELECT ROUND(lat, 1) AS lat, ROUND(lon, 1) AS lon, COUNT(*) AS n,
              MAX(city) AS city, MAX(country) AS country
       FROM hits
       WHERE lat IS NOT NULL AND lon IS NOT NULL
       GROUP BY 1, 2
       ORDER BY n DESC
       LIMIT ?1`
    ).bind(MAX_POINTS),
    env.DB.prepare(
      `SELECT country, COUNT(*) AS n, COUNT(DISTINCT city) AS cities
       FROM hits WHERE country IS NOT NULL
       GROUP BY 1 ORDER BY n DESC LIMIT ?1`
    ).bind(MAX_RANKS),
    // The "recent visitors" feed. City-level only — no coordinates and no
    // visitor hash leave the Worker here.
    env.DB.prepare(
      `SELECT city, region, country, ts
       FROM hits ORDER BY ts DESC LIMIT ?1`
    ).bind(MAX_RECENT),
  ]);

  const totalsRow = (totals.results?.[0] ?? {}) as Record<string, number>;

  return json(
    {
      totals: {
        visits: totalsRow.visits ?? 0,
        visitors: totalsRow.visitors ?? 0,
        countries: totalsRow.countries ?? 0,
        today: ((todayRow.results?.[0] ?? {}) as Record<string, number>).visits ?? 0,
      },
      points: points.results ?? [],
      topCountries: countries.results ?? [],
      recent: recent.results ?? [],
    },
    origin,
    { 'Cache-Control': `public, max-age=${STATS_CACHE_SECONDS}` }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Anything not on the allow-list is refused before it can read or write.
    if (!origin) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      if (request.method === 'POST' && pathname === '/collect') return await collect(request, env, origin);
      if (request.method === 'GET' && pathname === '/stats') return await stats(env, origin);
    } catch (error) {
      return json({ ok: false, error: String(error) }, origin, { 'Cache-Control': 'no-store' });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
  },
};
