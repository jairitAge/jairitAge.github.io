/**
 * Generates worker/seed-demo.sql — synthetic visits used to populate the map
 * while the site has no real traffic history yet.
 *
 * These rows are NOT real visitors. Every one of them carries a `demo` vid
 * prefix so they stay distinguishable from genuine traffic and can be removed
 * with a single statement:
 *
 *   DELETE FROM hits WHERE vid LIKE 'demo%';
 *
 * Usage: node scripts/gen-demo-seed.mjs [nowUnixSeconds]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NOW = Number(process.argv[2]) || Math.floor(Date.now() / 1000);
const DAY = 86400;

// [city, region, countryCode, lat, lon, weight] — weight drives how many visits
// the city gets, so the map has a plausible hierarchy instead of uniform dots.
const CITIES = [
  ['Beijing', 'Beijing', 'CN', 39.9, 116.4, 22],
  ['Shanghai', 'Shanghai', 'CN', 31.2, 121.5, 11],
  ['Shenzhen', 'Guangdong', 'CN', 22.5, 114.1, 7],
  ['Hangzhou', 'Zhejiang', 'CN', 30.3, 120.2, 5],
  ['Chengdu', 'Sichuan', 'CN', 30.6, 104.1, 4],
  ['Guangzhou', 'Guangdong', 'CN', 23.1, 113.3, 4],
  ['Wuhan', 'Hubei', 'CN', 30.6, 114.3, 3],
  ['Xian', 'Shaanxi', 'CN', 34.3, 108.9, 3],
  ['Nanjing', 'Jiangsu', 'CN', 32.1, 118.8, 3],
  ['Hong Kong', 'Central and Western', 'HK', 22.3, 114.2, 6],
  ['Taipei', 'Taipei City', 'TW', 25.0, 121.6, 4],
  ['Seoul', 'Seoul', 'KR', 37.6, 127.0, 5],
  ['Tokyo', 'Tokyo', 'JP', 35.7, 139.7, 8],
  ['Osaka', 'Osaka', 'JP', 34.7, 135.5, 3],
  ['Singapore', 'Singapore', 'SG', 1.35, 103.8, 5],
  ['Bangalore', 'Karnataka', 'IN', 12.97, 77.6, 4],
  ['Delhi', 'Delhi', 'IN', 28.6, 77.2, 3],
  ['Mumbai', 'Maharashtra', 'IN', 19.1, 72.9, 2],
  ['Dubai', 'Dubai', 'AE', 25.2, 55.3, 2],
  ['Tel Aviv', 'Tel Aviv', 'IL', 32.1, 34.8, 2],
  ['Moscow', 'Moscow', 'RU', 55.8, 37.6, 2],
  ['Zurich', 'Zurich', 'CH', 47.4, 8.5, 3],
  ['Munich', 'Bavaria', 'DE', 48.1, 11.6, 3],
  ['Berlin', 'Berlin', 'DE', 52.5, 13.4, 5],
  ['Paris', 'Ile-de-France', 'FR', 48.9, 2.35, 4],
  ['Amsterdam', 'North Holland', 'NL', 52.4, 4.9, 3],
  ['London', 'England', 'GB', 51.5, -0.13, 7],
  ['Cambridge', 'England', 'GB', 52.2, 0.12, 3],
  ['Edinburgh', 'Scotland', 'GB', 55.95, -3.2, 2],
  ['Dublin', 'Leinster', 'IE', 53.3, -6.26, 2],
  ['Stockholm', 'Stockholm', 'SE', 59.3, 18.1, 2],
  ['Copenhagen', 'Capital Region', 'DK', 55.7, 12.6, 2],
  ['Madrid', 'Madrid', 'ES', 40.4, -3.7, 2],
  ['Milan', 'Lombardy', 'IT', 45.5, 9.2, 2],
  ['Warsaw', 'Mazovia', 'PL', 52.2, 21.0, 2],
  ['New York', 'New York', 'US', 40.7, -74.0, 12],
  ['Boston', 'Massachusetts', 'US', 42.36, -71.06, 8],
  ['Cambridge', 'Massachusetts', 'US', 42.37, -71.11, 5],
  ['San Francisco', 'California', 'US', 37.77, -122.42, 11],
  ['San Jose', 'California', 'US', 37.34, -121.9, 6],
  ['Los Angeles', 'California', 'US', 34.05, -118.24, 6],
  ['San Diego', 'California', 'US', 32.72, -117.16, 4],
  ['Seattle', 'Washington', 'US', 47.6, -122.3, 6],
  ['Austin', 'Texas', 'US', 30.27, -97.74, 4],
  ['Chicago', 'Illinois', 'US', 41.9, -87.6, 4],
  ['Urbana', 'Illinois', 'US', 40.11, -88.2, 3],
  ['Ann Arbor', 'Michigan', 'US', 42.28, -83.74, 3],
  ['Atlanta', 'Georgia', 'US', 33.75, -84.4, 2],
  ['Pittsburgh', 'Pennsylvania', 'US', 40.44, -80.0, 3],
  ['Toronto', 'Ontario', 'CA', 43.65, -79.38, 5],
  ['Vancouver', 'British Columbia', 'CA', 49.28, -123.12, 3],
  ['Waterloo', 'Ontario', 'CA', 43.46, -80.52, 2],
  ['Sao Paulo', 'Sao Paulo', 'BR', -23.55, -46.63, 2],
  ['Mexico City', 'Mexico City', 'MX', 19.43, -99.13, 2],
  ['Sydney', 'New South Wales', 'AU', -33.87, 151.2, 4],
  ['Melbourne', 'Victoria', 'AU', -37.81, 144.96, 3],
  ['Auckland', 'Auckland', 'NZ', -36.85, 174.76, 2],
  ['Cape Town', 'Western Cape', 'ZA', -33.9, 18.4, 2],
  ['Nairobi', 'Nairobi', 'KE', -1.3, 36.8, 1],
  ['Cairo', 'Cairo', 'EG', 30.0, 31.2, 1],
];

// Deterministic PRNG so regenerating the file produces the same rows rather
// than a fresh diff every run.
let seed = 20260804;
function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

const HISTORY_DAYS = 75;
const rows = [];
let visitor = 0;

for (const [city, region, country, lat, lon, weight] of CITIES) {
  for (let i = 0; i < weight; i++) {
    // Bias timestamps toward the recent past: squaring pushes most visits
    // closer to now, which is how traffic to a new site actually looks.
    const age = Math.floor(random() ** 2 * HISTORY_DAYS * DAY);
    rows.push({
      vid: `demo${String(visitor++).padStart(4, '0')}`,
      ts: NOW - age,
      lat: +(lat + (random() - 0.5) * 0.06).toFixed(4),
      lon: +(lon + (random() - 0.5) * 0.06).toFixed(4),
      city,
      region,
      country,
    });
  }
}

rows.sort((a, b) => a.ts - b.ts);

const escape = (value) => `'${String(value).replace(/'/g, "''")}'`;
const values = rows
  .map(
    (r) =>
      `  (${escape(r.vid)}, ${r.ts}, ${escape(new Date(r.ts * 1000).toISOString().slice(0, 10))}, ` +
      `${r.lat}, ${r.lon}, ${escape(r.city)}, ${escape(r.region)}, ${escape(r.country)})`
  )
  .join(',\n');

const sql = `-- Synthetic visitor data. NOT real traffic.
--
-- Generated by scripts/gen-demo-seed.mjs to give the map something to show
-- before the site has accumulated real history. Every row uses a 'demo' vid
-- prefix, so removing all of it is one statement:
--
--   DELETE FROM hits WHERE vid LIKE 'demo%';
--
-- ${rows.length} visits across ${CITIES.length} cities, spread over the past ${HISTORY_DAYS} days.

INSERT INTO hits (vid, ts, day, lat, lon, city, region, country) VALUES
${values};
`;

const target = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed-demo.sql');
fs.writeFileSync(target, sql);
console.log(`wrote seed-demo.sql: ${rows.length} visits, ${CITIES.length} cities`);
