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
`);
