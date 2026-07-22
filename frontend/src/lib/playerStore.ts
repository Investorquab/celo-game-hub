import { create } from "zustand";

export interface PlayerProfile {
  address: string;
  xp: number;
  level: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  badges: string[];
  authenticated: boolean;
}

interface PlayerState {
  profile: PlayerProfile | null;
  setProfile: (profile: PlayerProfile) => void;
  recordResult: (result: "win" | "loss" | "draw") => void;
  clear: () => void;
}

/**
 * Local-first player state. On mount, the app should hydrate this from the
 * backend (`GET /api/players/:address`) once a wallet is connected and the
 * signature-based auth flow (see lib/auth.ts) has completed.
 */
export const usePlayerStore = create<PlayerState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  recordResult: (result) =>
    set((state) => {
      if (!state.profile) return state;
      const p = { ...state.profile };
      p.gamesPlayed += 1;
      if (result === "win") {
        p.wins += 1;
        p.xp += 30;
      } else if (result === "loss") {
        p.losses += 1;
        p.xp += 5;
      } else {
        p.draws += 1;
        p.xp += 10;
      }
      p.level = Math.floor(p.xp / 100) + 1;
      return { profile: p };
    }),
  clear: () => set({ profile: null }),
}));
