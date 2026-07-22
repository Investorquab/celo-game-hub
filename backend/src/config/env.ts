import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("4000"),
  // "sepolia" for the Celo Sepolia testnet (replaces the retired Alfajores
  // testnet), "mainnet" for real CELO — this is the single switch that
  // controls which chain the relayer signs and sends txs on.
  CELO_CHAIN: z.enum(["sepolia", "mainnet"]).default("sepolia"),
  CELO_RPC_URL: z.string().url(),
  RELAYER_PRIVATE_KEY: z.string().min(64, "must be a 0x-prefixed private key"),
  GAME_RESULTS_CONTRACT: z.string().startsWith("0x"),
  PLAYER_REGISTRY_CONTRACT: z.string().startsWith("0x"),
  // Gas sponsorship guardrails
  MAX_SPONSORED_TX_PER_PLAYER_PER_DAY: z.string().default("20"),
  MAX_GAS_LIMIT_WEI: z.string().default("500000"),
  TREASURY_LOW_BALANCE_ALERT_CELO: z.string().default("50"),
});

export const env = schema.parse(process.env);
