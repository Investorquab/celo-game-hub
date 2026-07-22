/**
 * Mirrors the XP/level math in contracts/src/PlayerRegistry.sol exactly —
 * if you change one, change the other, or the backend's cached
 * leaderboard/profile numbers will drift from what's actually on-chain.
 */
export const XP_WIN = 30;
export const XP_DRAW = 10;
export const XP_LOSS = 5;

export function xpForResult(result: "win" | "loss" | "draw"): number {
  if (result === "win") return XP_WIN;
  if (result === "draw") return XP_DRAW;
  return XP_LOSS;
}

export function levelForXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}
