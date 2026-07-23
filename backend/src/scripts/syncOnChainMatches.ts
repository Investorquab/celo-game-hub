/**
 * Reads MatchRecorded events directly from the deployed GameResults
 * contract and backfills the backend's SQLite cache (players + matches
 * tables) — the same cache /api/leaderboard and /api/players/:address
 * read from.
 *
 * Why this is needed: anything that calls GameResults.submitMatch
 * directly on-chain (the QA simulator, in particular) bypasses the
 * backend's own /api/matches endpoint entirely, so the backend's cache
 * never learns about those matches on its own. This script closes that
 * gap by reading the source of truth (the chain itself) and reconciling
 * the cache to match it.
 *
 * Safe to re-run: tracks the last synced block in the `sync_state` table,
 * and a unique index on matches.tx_hash means even a duplicate event
 * read is silently skipped rather than double-counted.
 *
 * Usage:
 *   npx tsx src/scripts/syncOnChainMatches.ts
 *
 * Run this on a schedule (cron, or a pm2 process with a sleep loop) if
 * you want the live leaderboard to stay reasonably current with on-chain
 * activity that didn't come through the normal API.
 */
import "dotenv/config";
import { createPublicClient, http, keccak256, toHex } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { db } from "../services/db.js";
import { xpForResult, levelForXp } from "../lib/xp.js";

const CELO_CHAIN = process.env.CELO_CHAIN === "mainnet" ? celo : celoSepolia;
const CELO_RPC_URL = process.env.CELO_RPC_URL;
const GAME_RESULTS_CONTRACT = process.env.GAME_RESULTS_CONTRACT as `0x${string}` | undefined;
// Block the contract was deployed in — no events can exist before this,
// so it's a safe default starting point for a first-ever sync.
const SYNC_START_BLOCK = BigInt(process.env.SYNC_START_BLOCK ?? "72845334");
// Public RPC providers commonly cap how many blocks one getLogs call can
// span — fetch in chunks so this works regardless of that limit.
const BLOCK_CHUNK_SIZE = 5000n;

const RESULT_NAMES = ["win", "loss", "draw"] as const;
const KNOWN_GAME_IDS: Record<string, string> = {
  [keccak256(toHex("tic-tac-toe"))]: "tic-tac-toe",
};

const matchRecordedEvent = {
  type: "event",
  name: "MatchRecorded",
  inputs: [
    { name: "player", type: "address", indexed: true },
    { name: "gameId", type: "bytes32", indexed: false },
    { name: "result", type: "uint8", indexed: false },
    { name: "matchIndex", type: "uint256", indexed: false },
  ],
} as const;

function getLastSyncedBlock(): bigint {
  const row = db.prepare(`SELECT value FROM sync_state WHERE key = 'last_synced_block'`).get() as
    | { value: string }
    | undefined;
  return row ? BigInt(row.value) : SYNC_START_BLOCK;
}

function setLastSyncedBlock(block: bigint): void {
  db.prepare(
    `INSERT INTO sync_state (key, value) VALUES ('last_synced_block', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(block.toString());
}

function upsertMatch(params: {
  playerAddress: string;
  gameId: string;
  result: "win" | "loss" | "draw";
  txHash: string;
  blockTimestamp: number;
}): boolean {
  const { playerAddress, gameId, result, txHash, blockTimestamp } = params;
  const address = playerAddress.toLowerCase();

  const existing = db.prepare(`SELECT id FROM matches WHERE tx_hash = ?`).get(txHash);
  if (existing) return false; // already synced, e.g. this is a re-run

  db.prepare(
    `INSERT INTO players (address, created_at) VALUES (?, ?)
     ON CONFLICT(address) DO NOTHING`
  ).run(address, blockTimestamp);

  const matchId = `sync-${txHash}`;
  db.prepare(
    `INSERT INTO matches (id, player_address, game_id, result, tx_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`
  ).run(matchId, address, gameId, result, txHash, blockTimestamp);

  const xpGain = xpForResult(result);
  const winInc = result === "win" ? 1 : 0;
  const lossInc = result === "loss" ? 1 : 0;
  const drawInc = result === "draw" ? 1 : 0;

  const current = db.prepare(`SELECT xp FROM players WHERE address = ?`).get(address) as
    | { xp: number }
    | undefined;
  const newXp = (current?.xp ?? 0) + xpGain;

  db.prepare(
    `UPDATE players
     SET xp = ?, level = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?
     WHERE address = ?`
  ).run(newXp, levelForXp(newXp), winInc, lossInc, drawInc, address);

  return true;
}

async function main() {
  if (!CELO_RPC_URL || !GAME_RESULTS_CONTRACT) {
    console.error("ERROR: CELO_RPC_URL and GAME_RESULTS_CONTRACT must be set in .env");
    process.exit(1);
  }

  const client = createPublicClient({ chain: CELO_CHAIN, transport: http(CELO_RPC_URL) });

  const latestBlock = await client.getBlockNumber();
  let fromBlock = getLastSyncedBlock() + 1n;

  if (fromBlock > latestBlock) {
    console.log(`Already synced through block ${latestBlock}. Nothing new.`);
    return;
  }

  console.log(`Syncing MatchRecorded events from block ${fromBlock} to ${latestBlock}...`);

  let totalNew = 0;
  let totalSeen = 0;

  while (fromBlock <= latestBlock) {
    const toBlock = fromBlock + BLOCK_CHUNK_SIZE > latestBlock ? latestBlock : fromBlock + BLOCK_CHUNK_SIZE;

    const logs = await client.getLogs({
      address: GAME_RESULTS_CONTRACT,
      event: matchRecordedEvent,
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      totalSeen++;
      const { player, gameId, result } = log.args as {
        player: `0x${string}`;
        gameId: `0x${string}`;
        result: number;
      };

      const block = await client.getBlock({ blockNumber: log.blockNumber! });
      const gameName = KNOWN_GAME_IDS[gameId] ?? "unknown";
      const resultName = RESULT_NAMES[result] ?? "draw";

      const wasNew = upsertMatch({
        playerAddress: player,
        gameId: gameName,
        result: resultName,
        txHash: log.transactionHash!,
        blockTimestamp: Number(block.timestamp) * 1000,
      });
      if (wasNew) totalNew++;
    }

    setLastSyncedBlock(toBlock);
    fromBlock = toBlock + 1n;
  }

  console.log(`Done. Saw ${totalSeen} event(s), added ${totalNew} new match(es) to the cache.`);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
