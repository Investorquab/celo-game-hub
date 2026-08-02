import { useConnect } from "wagmi";
import { motion } from "framer-motion";

export function LoginPage() {
  const { connect, connectors, isPending } = useConnect();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-arcade-text">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <div className="mb-6 h-14 w-14 rounded-2xl bg-gradient-to-br from-arcade-green to-arcade-blue shadow-glow" />

        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Celo Arcade
        </h1>
        <p className="mt-3 max-w-sm text-sm text-arcade-muted">
          Play on-chain games, own your progress, and climb a real leaderboard —
          gas sponsored, so you never need funds to start.
        </p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={isPending}
          onClick={() => connect({ connector: connectors[0] })}
          className="btn-primary mt-8 px-8 py-3 text-base disabled:opacity-60"
        >
          {isPending ? "Connecting..." : "Connect Wallet to Play"}
        </motion.button>

        <p className="mt-6 text-xs text-arcade-muted">
          New to wallets? Any wallet works — MetaMask, Coinbase Wallet, or similar.
        </p>
      </motion.div>
    </div>
  );
}
