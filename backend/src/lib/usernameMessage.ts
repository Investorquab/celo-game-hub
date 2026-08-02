/**
 * Mirrors the pattern in lib/matchMessage.ts — a single-use nonce plus a
 * canonical signed message, so setting a username requires proving you
 * actually control that wallet, not just knowing its address.
 */
export function buildUsernameMessage(params: { address: string; username: string; nonce: string }) {
  const { address, username, nonce } = params;
  return [
    "Celo Arcade — set username",
    "",
    `Address: ${address}`,
    `Username: ${username}`,
    `Nonce: ${nonce}`,
    "",
    "Signing this only sets your display name. It does not move funds.",
  ].join("\n");
}

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const usernameNonces = new Map<string, NonceEntry>();
const NONCE_TTL_MS = 5 * 60 * 1000;

export function issueUsernameNonce(address: string): string {
  const nonce = crypto.randomUUID();
  usernameNonces.set(address.toLowerCase(), { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function peekUsernameNonce(address: string): string | null {
  const entry = usernameNonces.get(address.toLowerCase());
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.nonce;
}

export function consumeUsernameNonce(address: string): void {
  usernameNonces.delete(address.toLowerCase());
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
