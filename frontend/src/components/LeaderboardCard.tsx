import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchLeaderboard, LeaderboardEntry } from "@/lib/relayerClient";

function shorten(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function LeaderboardCard() {
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
      {entries.slice(0, 10).map((entry, i) => (
        <motion.div
          key={entry.address}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center justify-between border-b border-white/5 px-5 py-3 last:border-0"
        >
          <div className="flex items-center gap-3">
            <span className="w-5 text-sm font-medium text-arcade-muted">{i + 1}</span>
            <span className="font-mono text-sm">{shorten(entry.address)}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-arcade-muted">{entry.wins}W</span>
            <span className="pill bg-arcade-green/10 text-arcade-green">{entry.xp} XP</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
