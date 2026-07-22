/**
 * Must exactly mirror frontend/src/lib/matchMessage.ts — this is what lets
 * the backend verify a player actually signed off on THIS result before
 * the relayer spends gas recording it on-chain.
 */
export function buildMatchMessage(params: {
  playerAddress: string;
  gameId: string;
  result: "win" | "loss" | "draw";
  boardHash: string;
  nonce: string;
}) {
  const { playerAddress, gameId, result, boardHash, nonce } = params;
  return [
    "Celo Arcade — confirm match result",
    "",
    `Player: ${playerAddress}`,
    `Game: ${gameId}`,
    `Result: ${result}`,
    `Board: ${boardHash}`,
    `Nonce: ${nonce}`,
    "",
    "Signing this only records this match result. It does not move funds.",
  ].join("\n");
}

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const matchNonces = new Map<string, NonceEntry>();
const NONCE_TTL_MS = 5 * 60 * 1000;

export function issueMatchNonce(address: string): string {
  const nonce = crypto.randomUUID();
  matchNonces.set(address.toLowerCase(), { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

/** Returns the nonce if valid and unexpired, WITHOUT consuming it. */
export function peekMatchNonce(address: string): string | null {
  const entry = matchNonces.get(address.toLowerCase());
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.nonce;
}

/** Consumes the nonce so it can't be replayed for a second submission. */
export function consumeMatchNonce(address: string): void {
  matchNonces.delete(address.toLowerCase());
}
