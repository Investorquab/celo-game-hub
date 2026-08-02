import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ProfileCard } from "@/components/ProfileCard";
import { GameGrid } from "@/components/GameGrid";
import { TicTacToe } from "@/components/TicTacToe";
import { RockPaperScissors } from "@/components/RockPaperScissors";
import { NetworkGuard } from "@/components/NetworkGuard";
import { LeaderboardCard } from "@/components/LeaderboardCard";
import { FullLeaderboard } from "@/components/FullLeaderboard";
import { LoginPage } from "@/components/LoginPage";
import { ProfilePage } from "@/components/ProfilePage";
import { hydrateProfileFromBackend } from "@/lib/profileSync";

type View = "home" | "leaderboard" | "profile";

export default function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      void hydrateProfileFromBackend(address);
    }
  }, [isConnected, address]);

  // Not connected yet — show the dedicated login screen instead of the
  // arcade. Nothing here changes what an already-connected/returning
  // player sees; this only ever appears before a wallet is connected.
  if (!isConnected) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen text-arcade-text">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <button
          onClick={() => {
            setActiveGame(null);
            setView("home");
          }}
          className="flex items-center gap-2"
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-arcade-green to-arcade-blue shadow-glow" />
          <span className="font-display text-lg font-semibold">Celo Arcade</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveGame(null);
              setView("profile");
            }}
            className="text-sm text-arcade-muted transition hover:text-arcade-text"
          >
            Profile
          </button>
          <WalletConnectButton />
        </div>
      </header>

      <NetworkGuard />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {activeGame === "tic-tac-toe" || activeGame === "rock-paper-scissors" ? (
          <div className="mx-auto max-w-md">
            <button
              onClick={() => setActiveGame(null)}
              className="mb-4 text-sm text-arcade-muted hover:text-arcade-text"
            >
              ← Back to arcade
            </button>
            {activeGame === "tic-tac-toe" ? <TicTacToe /> : <RockPaperScissors />}
          </div>
        ) : view === "profile" ? (
          <div>
            <button
              onClick={() => setView("home")}
              className="mb-4 text-sm text-arcade-muted hover:text-arcade-text"
            >
              ← Back to arcade
            </button>
            <ProfilePage />
          </div>
        ) : view === "leaderboard" ? (
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => setView("home")}
              className="mb-4 text-sm text-arcade-muted hover:text-arcade-text"
            >
              ← Back to arcade
            </button>
            <h2 className="mb-4 font-display text-xl">Full Leaderboard</h2>
            <FullLeaderboard />
          </div>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              <div className="md:col-span-2">
                <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                  Play on-chain.
                  <br />
                  <span className="text-gradient-green">Own your progress.</span>
                </h1>
                <p className="mt-3 max-w-md text-sm text-arcade-muted">
                  Connect a wallet, play a match, and your XP, wins, and
                  achievements are recorded on Celo — gas sponsored, so you
                  never need funds to start.
                </p>
              </div>
              <ProfileCard />
            </motion.section>

            <section className="mb-8">
              <h2 className="mb-4 font-display text-xl">Games</h2>
              <GameGrid onPlay={setActiveGame} />
            </section>

            <section>
              <h2 className="mb-4 font-display text-xl">Leaderboard</h2>
              <LeaderboardCard onViewAll={() => setView("leaderboard")} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
