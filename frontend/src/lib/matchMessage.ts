/**
 * Canonical message the player signs to attest to a match result. Both the
 * frontend (when requesting a signature) and the backend (when verifying it
 * before paying gas) must build this string identically, or verification
 * will always fail. If you change this format, update
 * backend/src/lib/matchMessage.ts to match.
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
