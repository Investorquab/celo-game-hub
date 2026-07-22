import { motion } from "framer-motion";
import { usePlayerStore } from "@/lib/playerStore";

export function ProfileCard() {
  const profile = usePlayerStore((s) => s.profile);

  if (!profile) {
    return (
      <div className="glass-card p-5 text-sm text-arcade-muted">
        Connect your wallet and sign in to see your profile, XP, and match
        history.
      </div>
    );
  }

  const xpIntoLevel = profile.xp % 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card shadow-card p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-arcade-muted">
            Level {profile.level}
          </p>
          <p className="font-display text-lg text-arcade-text">
            {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
          </p>
        </div>
        <div className="pill bg-arcade-green/10 text-arcade-green">
          {profile.xp} XP
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-arcade-green to-arcade-blue"
          initial={{ width: 0 }}
          animate={{ width: `${xpIntoLevel}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Wins" value={profile.wins} />
        <Stat label="Games" value={profile.gamesPlayed} />
        <Stat label="Badges" value={profile.badges.length} />
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] py-2">
      <p className="font-display text-base text-arcade-text">{value}</p>
      <p className="text-[11px] text-arcade-muted">{label}</p>
    </div>
  );
}
