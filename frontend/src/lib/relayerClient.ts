const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export type GameId = "tic-tac-toe" | "rock-paper-scissors";

export interface SubmitMatchPayload {
  playerAddress: string;
  gameId: GameId;
  result: "win" | "loss" | "draw";
  boardHash: string;
  signature: string;
}

export interface SubmitMatchResponse {
  txHash: string;
  status: "queued" | "confirmed" | "failed";
}

export async function fetchMatchNonce(playerAddress: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/matches/nonce?address=${playerAddress}`);
  if (!res.ok) throw new Error("Failed to fetch match nonce");
  const data = await res.json();
  return data.nonce;
}

export interface PlayerProfileResponse {
  address: string;
  username: string | null;
  xp: number;
  level: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

export async function fetchPlayerProfile(address: string): Promise<PlayerProfileResponse> {
  const res = await fetch(`${API_BASE}/api/players/${address}`);
  if (!res.ok) throw new Error("Failed to fetch player profile");
  return res.json();
}

export async function fetchUsernameNonce(address: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/username/nonce?address=${address}`);
  if (!res.ok) throw new Error("Failed to fetch username nonce");
  const data = await res.json();
  return data.nonce;
}

export async function setUsername(params: {
  address: string;
  username: string;
  signature: string;
}): Promise<{ ok: true; address: string; username: string }> {
  const res = await fetch(`${API_BASE}/api/username`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to set username: ${res.status}`);
  }
  return res.json();
}

export async function searchUsername(username: string): Promise<PlayerProfileResponse | null> {
  const res = await fetch(`${API_BASE}/api/username/${encodeURIComponent(username)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to search username");
  return res.json();
}

/**
 * Sends a signed match result to the backend relayer, which pays gas from
 * the sponsor treasury and submits the on-chain transaction on the player's
 * behalf. See backend/src/relayer for the server-side implementation and
 * its rate limits / sponsorship rules.
 */
export async function submitMatchResult(
  payload: SubmitMatchPayload
): Promise<SubmitMatchResponse> {
  const res = await fetch(`${API_BASE}/api/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Relayer submission failed: ${res.status}`);
  }

  return res.json();
}

export interface LeaderboardEntry {
  address: string;
  username: string | null;
  xp: number;
  level: number;
  wins: number;
  losses: number;
  draws: number;
}

export async function fetchLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const res = await fetch(`${API_BASE}/api/leaderboard`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}
