import { motion, AnimatePresence } from "framer-motion";

export type TxState = "idle" | "switching" | "registering" | "signing" | "relaying" | "confirmed" | "failed";

const copy: Record<TxState, string> = {
  idle: "",
  switching: "Switching your wallet to the Celo network...",
  registering: "One-time setup: confirm registration in your wallet (small network fee, only once)",
  signing: "Waiting for signature...",
  relaying: "Relayer submitting transaction...",
  confirmed: "Match recorded on-chain",
  failed: "Transaction failed — result kept locally",
};

export function TxConfirmation({ state, txHash }: { state: TxState; txHash?: string }) {
  if (state === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="glass-card mt-4 flex items-center gap-3 px-4 py-3 text-sm"
      >
        {state === "switching" || state === "registering" || state === "signing" || state === "relaying" ? (
          <motion.span
            className="h-3 w-3 rounded-full border-2 border-arcade-blue border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
        ) : state === "confirmed" ? (
          <span className="h-2.5 w-2.5 rounded-full bg-arcade-green shadow-glow" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        )}
        <div>
          <p className="text-arcade-text">{copy[state]}</p>
          {txHash && (
            <p className="mt-0.5 truncate text-xs text-arcade-muted">
              {txHash.slice(0, 10)}...{txHash.slice(-8)} · gas sponsored by Celo Arcade Treasury
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
