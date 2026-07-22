import { useAccount, useConnect, useDisconnect } from "wagmi";
import { motion } from "framer-motion";

function shorten(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => disconnect()}
        className="glass-card glass-card-hover flex items-center gap-2 px-4 py-2 text-sm font-medium"
      >
        <span className="h-2 w-2 rounded-full bg-arcade-green shadow-glow" />
        {shorten(address)}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
      className="btn-primary text-sm disabled:opacity-60"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </motion.button>
  );
}
