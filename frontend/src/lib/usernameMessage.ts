/**
 * Must exactly mirror backend/src/lib/usernameMessage.ts — this is what
 * the backend reconstructs and verifies the signature against.
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
