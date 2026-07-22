import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Wagmi does NOT automatically put a connected wallet on the chain the app
 * is built for — it just uses whatever chain the wallet happens to be on
 * (Ethereum mainnet, in this app's case, since that's MetaMask's default).
 * Without this check, every contract call would silently target the wrong
 * network. This banner makes the mismatch visible and offers a one-click
 * fix via `wallet_switchEthereumChain`.
 */
export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === celo.id) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-4 flex max-w-6xl items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200"
      >
        <span>
          Your wallet is on the wrong network — Celo Arcade only works on Celo Mainnet.
        </span>
        <button
          disabled={isPending}
          onClick={() => switchChain({ chainId: celo.id })}
          className="whitespace-nowrap rounded-lg border border-amber-400/40 px-3 py-1 font-medium text-amber-100 transition hover:bg-amber-400/10 disabled:opacity-60"
        >
          {isPending ? "Switching..." : "Switch to Celo"}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
