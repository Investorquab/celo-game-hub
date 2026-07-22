import { signMessage } from "wagmi/actions";
import { wagmiConfig } from "./wagmi";

const AUTH_MESSAGE_PREFIX = "Sign in to Celo Arcade";

/**
 * Builds a deterministic, human-readable message for the user to sign.
 * The nonce should come from the backend (`GET /api/auth/nonce`) in a real
 * deployment to prevent replay; a timestamp-based nonce is used here as a
 * placeholder until that endpoint is wired up.
 */
export function buildAuthMessage(address: string, nonce: string) {
  return [
    AUTH_MESSAGE_PREFIX,
    "",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    "",
    "This signature only proves wallet ownership. It does not authorize any transaction.",
  ].join("\n");
}

export async function signInWithWallet(address: string) {
  const nonce = crypto.randomUUID();
  const message = buildAuthMessage(address, nonce);
  const signature = await signMessage(wagmiConfig, { message });
  return { message, signature, nonce };
}
