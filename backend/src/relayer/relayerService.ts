import { createWalletClient, createPublicClient, http, parseGwei } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { env } from "../config/env.js";
import { db } from "../services/db.js";

const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as `0x${string}`);

export const relayerAccount = account;

// Single switch (CELO_CHAIN in .env) controls testnet vs mainnet everywhere
// the backend talks to the chain. Celo Sepolia replaced the retired
// Alfajores testnet in 2025/2026 — see contracts/README for migration notes.
const chain = env.CELO_CHAIN === "mainnet" ? celo : celoSepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(env.CELO_RPC_URL),
});

export const walletClient = createWalletClient({
  account,
  chain,
  transport: http(env.CELO_RPC_URL),
});

const MAX_PER_DAY = Number(env.MAX_SPONSORED_TX_PER_PLAYER_PER_DAY);
const MAX_GAS_LIMIT = BigInt(env.MAX_GAS_LIMIT_WEI);

export class SponsorshipLimitError extends Error {}
export class TreasuryLowBalanceError extends Error {}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Throws if the player has exhausted their daily sponsored-tx allowance. */
export function checkAndIncrementDailyUsage(playerAddress: string) {
  const day = todayKey();
  const row = db
    .prepare("SELECT count FROM sponsorship_usage WHERE player_address = ? AND day = ?")
    .get(playerAddress, day) as { count: number } | undefined;

  const current = row?.count ?? 0;
  if (current >= MAX_PER_DAY) {
    throw new SponsorshipLimitError(
      `Player ${playerAddress} exceeded daily sponsored transaction limit (${MAX_PER_DAY})`
    );
  }

  db.prepare(
    `INSERT INTO sponsorship_usage (player_address, day, count)
     VALUES (?, ?, 1)
     ON CONFLICT(player_address, day) DO UPDATE SET count = count + 1`
  ).run(playerAddress, day);
}

/** Throws if the treasury balance is too low to safely sponsor another tx. */
export async function assertTreasuryHealthy() {
  const balance = await publicClient.getBalance({ address: account.address });
  const minBalance = parseGwei("1") * 1_000_000n; // conservative floor; tune per deployment
  if (balance < minBalance) {
    throw new TreasuryLowBalanceError("Sponsor treasury balance too low to sponsor transactions");
  }
  return balance;
}

export function withinGasLimit(estimatedGas: bigint) {
  return estimatedGas <= MAX_GAS_LIMIT;
}
