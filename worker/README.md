# Visitor map worker

Backend for the footer widget and the `/visitors` page. Runs on Cloudflare's free
plan: visitor coordinates come from `request.cf`, so there is no third-party
IP-geolocation service in the loop.

## Deploy

```bash
cd worker
npm install
npx wrangler login

# 1. Create the database, then paste the printed database_id into wrangler.toml.
npx wrangler d1 create visitor-map

# 2. Create the table.
npm run db:init

# 3. Set the hashing salt to any long random string. Visitors are identified by
#    SHA-256(salt | ip | user-agent); the raw IP is never stored, and without the
#    salt the stored hash cannot be walked back to an IP.
openssl rand -hex 32 | npx wrangler secret put VISITOR_SALT

# 4. Ship it.
npm run deploy
```

Deploy prints a URL like `https://visitor-map.<your-subdomain>.workers.dev`. Put it
in `content/config.toml` under `[visitors] endpoint`, then rebuild the site.

Check `ALLOWED_ORIGINS` in `wrangler.toml` matches where the site is served from —
any other origin gets a 403.

## Routes

| Route | Purpose |
|---|---|
| `POST /collect` | Records the current visit. Repeat visits from the same visitor within 30 minutes count as one session. |
| `GET /stats` | Aggregates for the map, the stat tiles and the country/city tables. Cached for 60s. |

## What is stored

One row per counted visit: a salted visitor hash, a timestamp, coordinates, and
city/region/country. No raw IP, no user agent, no cookies. `/stats` rounds
coordinates to one decimal (~11km) before grouping, so a response never carries a
precise visitor location.

## Free-plan headroom

D1's free plan allows 10 databases, 500MB each. A row is roughly 100 bytes, so the
practical ceiling is in the millions of visits.
