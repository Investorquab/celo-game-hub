import { fetchPlayerProfile } from "./relayerClient";
import { usePlayerStore } from "./playerStore";

/**
 * Pulls the authoritative cached profile from the backend and writes it
 * into the store. Call this on wallet connect (so XP/wins survive a page
 * refresh) and again after a match confirms (so the UI reflects the real
 * backend numbers rather than just the optimistic local increment).
 */
export async function hydrateProfileFromBackend(address: string) {
  try {
    const data = await fetchPlayerProfile(address);
    usePlayerStore.getState().setProfile({
      address: data.address,
      xp: data.xp,
      level: data.level,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      gamesPlayed: data.gamesPlayed,
      badges: [],
      authenticated: true,
    });
  } catch (err) {
    console.error("Failed to hydrate player profile:", err);
  }
}
