import { createConfig, http } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// Set VITE_WALLETCONNECT_PROJECT_ID in your .env (get one free at cloud.walletconnect.com)
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined;

export const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Celo Arcade" }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
