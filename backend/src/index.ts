import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { matchesRouter } from "./routes/matches.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { playersRouter } from "./routes/players.js";
import "./services/db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Sponsored-transaction endpoints get a tighter limit; this is a coarse
// per-IP layer on top of the per-player daily cap enforced in relayerService.
const relayerLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

app.use("/api/auth", authRouter);
app.use("/api/matches", relayerLimiter, matchesRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/players", playersRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(env.PORT);
app.listen(port, () => {
  console.log(`Celo Arcade backend listening on :${port}`);
  console.log(`Chain: ${env.CELO_CHAIN.toUpperCase()} (${env.CELO_RPC_URL})`);
  if (env.CELO_CHAIN === "mainnet") {
    console.log("⚠️  MAINNET MODE — the relayer will spend real CELO on every sponsored transaction.");
  }
});
