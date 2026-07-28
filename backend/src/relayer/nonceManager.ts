import { publicClient, relayerAccount } from "./relayerService.js";

/**
 * Serializes nonce allocation for the relayer account.
 *
 * The bug this fixes: matches.ts sends TWO sequential transactions from
 * the same wallet per request (submitMatch, then updateRanking) without
 * waiting for the first to actually mine — viem's default per-call nonce
 * fetch would ask the chain for "next nonce" before the first transaction
 * is confirmed, getting the same number both times. Same failure mode as
 * the "nonce too low" bugs already fixed in the Python simulator and the
 * sync script, just one level up (within a single request, and across
 * concurrent requests hitting this same process).
 *
 * How it works: every caller gets a nonce from one shared promise chain.
 * `.then()` callbacks on the same promise resolve in the order they were
 * attached, so even multiple concurrent `reserveNonce()` calls hand out
 * strictly increasing, non-colliding numbers — no explicit lock needed.
 */
let noncePromise: Promise<number> | null = null;

function fetchInitialNonce(): Promise<number> {
  return publicClient.getTransactionCount({
    address: relayerAccount.address,
    blockTag: "pending",
  });
}

export function reserveNonce(): Promise<number> {
  if (!noncePromise) {
    noncePromise = fetchInitialNonce();
  }
  const current = noncePromise;
  noncePromise = current.then((n) => n + 1);
  return current;
}

/**
 * Call this if a transaction using a reserved nonce fails to send (network
 * error, etc.) — otherwise the in-memory counter drifts permanently ahead
 * of what the chain actually has, since the failed nonce was never really
 * consumed on-chain.
 */
export function resyncNonce(): void {
  noncePromise = null;
}
