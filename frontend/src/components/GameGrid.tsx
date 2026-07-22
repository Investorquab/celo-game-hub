import { motion } from "framer-motion";

type GameStatus = "live" | "soon" | "locked";

interface GameDef {
  id: string;
  name: string;
  status: GameStatus;
  blurb: string;
}

const GAMES: GameDef[] = [
  { id: "tic-tac-toe", name: "Tic-Tac-Toe", status: "live", blurb: "Classic 3x3. Play vs AI, on-chain results." },
  { id: "rps", name: "Rock Paper Scissors", status: "soon", blurb: "Fast rounds, higher stakes." },
  { id: "farm-kingdom", name: "Farm Kingdom", status: "locked", blurb: "Build and grow your on-chain farm." },
  { id: "snake", name: "Snake", status: "locked", blurb: "Arcade classic, leaderboard chase." },
  { id: "memory", name: "Memory Game", status: "locked", blurb: "Match pairs, beat the clock." },
];

const statusStyle: Record<GameStatus, string> = {
  live: "bg-arcade-green/10 text-arcade-green",
  soon: "bg-arcade-purple/10 text-arcade-purple",
  locked: "bg-white/5 text-arcade-muted",
};

const statusLabel: Record<GameStatus, string> = {
  live: "LIVE",
  soon: "COMING SOON",
  locked: "LOCKED",
};

export function GameGrid({ onPlay }: { onPlay: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {GAMES.map((game, i) => (
        <motion.div
          key={game.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`glass-card glass-card-hover p-5 ${
            game.status !== "live" ? "opacity-70" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">{game.name}</h3>
            <span className={`pill ${statusStyle[game.status]}`}>
              {statusLabel[game.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-arcade-muted">{game.blurb}</p>
          <button
            disabled={game.status !== "live"}
            onClick={() => onPlay(game.id)}
            className="mt-4 w-full rounded-xl border border-white/10 py-2 text-sm font-medium text-arcade-text transition hover:border-arcade-green/40 hover:text-arcade-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {game.status === "live" ? "Play now" : "Notify me"}
          </button>
        </motion.div>
      ))}
    </div>
  );
}
