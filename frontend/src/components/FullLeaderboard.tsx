import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchLeaderboard, LeaderboardEntry } from "@/lib/relayerClient";

function shorten(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function FullLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((data) => {
        if (!cancelled) setEntries(data.leaderboard);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="glass-card p-5 text-sm text-arcade-muted">
        Couldn't load the leaderboard right now.
      </div>
    );
  }

  if (!entries) {
    return <div className="glass-card p-5 text-sm text-arcade-muted">Loading leaderboard...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="glass-card p-5 text-sm text-arcade-muted">
        No matches played yet — be the first on the board.
      </div>
    );
  }

  return (
    <div className="glass-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 text-xs uppercase tracking-wide text-arcade-muted">
        <span>Rank / Player</span>
        <span>Wins · XP</span>
      </div>
      {entries.map((entry, i) => (
        <motion.div
          key={entry.address}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: Math.min(i * 0.02, 0.6) }}
          className="flex items-center justify-between border-b border-white/5 px-5 py-3 last:border-0"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 text-sm font-medium text-arcade-muted">{i + 1}</span>
            <span className="text-sm">
              {entry.username ?? <span className="font-mono">{shorten(entry.address)}</span>}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="w-10 text-right tabular-nums text-arcade-muted">{entry.wins}W</span>
            <span className="pill w-20 bg-arcade-green/10 text-center text-arcade-green tabular-nums">
              {entry.xp} XP
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
