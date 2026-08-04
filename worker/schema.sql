-- Visitor map storage. One row per counted visit; no raw IP is ever stored.
CREATE TABLE IF NOT EXISTS hits (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  vid     TEXT    NOT NULL,  -- salted hash of IP + user agent
  ts      INTEGER NOT NULL,  -- unix seconds
  day     TEXT    NOT NULL,  -- YYYY-MM-DD (UTC)
  lat     REAL,
  lon     REAL,
  city    TEXT,
  region  TEXT,
  country TEXT
);

-- Serves the session-dedup lookup on every /collect.
CREATE INDEX IF NOT EXISTS idx_hits_vid_ts ON hits (vid, ts);
-- Serves the "today" counter.
CREATE INDEX IF NOT EXISTS idx_hits_day ON hits (day);
