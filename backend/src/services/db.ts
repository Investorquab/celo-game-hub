import Database from "better-sqlite3";

export const db = new Database(process.env.DB_PATH ?? "arcade.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    address TEXT PRIMARY KEY,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    player_address TEXT NOT NULL,
    game_id TEXT NOT NULL,
    result TEXT NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (player_address) REFERENCES players(address)
  );

  CREATE TABLE IF NOT EXISTS sponsorship_usage (
    player_address TEXT NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (player_address, day)
  );

  -- Tracks progress for scripts/syncOnChainMatches.ts, so re-running it
  -- only processes blocks it hasn't seen yet.
  CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Lets the on-chain sync script safely re-run without double-counting a
  -- match it already processed. NULL tx_hash (queued-but-not-yet-confirmed
  -- rows from the live API) are still allowed to repeat.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_tx_hash ON matches(tx_hash) WHERE tx_hash IS NOT NULL;
`);
