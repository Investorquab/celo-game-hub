import { Router } from "express";
import { z } from "zod";
import { keccak256, toHex, verifyMessage } from "viem";
import { db } from "../services/db.js";
import { gameResultsAbi } from "../config/abis.js";
import { env } from "../config/env.js";
import {
  buildMatchMessage,
  consumeMatchNonce,
  issueMatchNonce,
  peekMatchNonce,
} from "../lib/matchMessage.js";
import {
  assertTreasuryHealthy,
  checkAndIncrementDailyUsage,
  SponsorshipLimitError,
  TreasuryLowBalanceError,
  walletClient,
} from "../relayer/relayerService.js";
import { xpForResult, levelForXp } from "../lib/xp.js";

export const matchesRouter = Router();

/** Step 1: the frontend calls this before asking the wallet to sign. */
matchesRouter.get("/nonce", (req, res) => {
  const address = String(req.query.address ?? "");
  if (!address.startsWith("0x")) {
    return res.status(400).json({ error: "address query param required" });
  }
  const nonce = issueMatchNonce(address);
  res.json({ nonce });
});

const submitSchema = z.object({
  playerAddress: z.string().startsWith("0x"),
  gameId: z.enum(["tic-tac-toe"]),
  result: z.enum(["win", "loss", "draw"]),
  boardHash: z.string(),
  signature: z.string().startsWith("0x"),
});

const resultToEnum = { win: 0, loss: 1, draw: 2 } as const;

/** Step 2: the frontend submits the signed result here. */
matchesRouter.post("/", async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { playerAddress, gameId, result, boardHash, signature } = parsed.data;

  const nonce = peekMatchNonce(playerAddress);
  if (!nonce) {
    return res.status(401).json({ error: "missing or expired nonce — call GET /api/matches/nonce first" });
  }

  const message = buildMatchMessage({ playerAddress, gameId, result, boardHash, nonce });

  let signatureValid = false;
  try {
    signatureValid = await verifyMessage({
      address: playerAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    return res.status(401).json({ error: "signature does not match the claimed match result" });
  }

  // Nonce is single-use: burn it now so this exact signed payload can't be replayed.
  consumeMatchNonce(playerAddress);

  try {
    checkAndIncrementDailyUsage(playerAddress);
    await assertTreasuryHealthy();

    // Ensure the player row exists before the matches insert, which has a
    // foreign key on players.address. Playing doesn't require a separate
    // sign-in step — the first submitted match registers the player.
    db.prepare(
      `INSERT INTO players (address, created_at) VALUES (?, ?)
       ON CONFLICT(address) DO NOTHING`
    ).run(playerAddress.toLowerCase(), Date.now());

    const matchId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO matches (id, player_address, game_id, result, status, created_at)
       VALUES (?, ?, ?, ?, 'queued', ?)`
    ).run(matchId, playerAddress.toLowerCase(), gameId, result, Date.now());

    const txHash = await walletClient.writeContract({
      address: env.GAME_RESULTS_CONTRACT as `0x${string}`,
      abi: gameResultsAbi,
      functionName: "submitMatch",
      args: [
        playerAddress as `0x${string}`,
        keccak256(toHex(gameId)),
        resultToEnum[result],
      ],
    });

    db.prepare(`UPDATE matches SET tx_hash = ?, status = 'confirmed' WHERE id = ?`).run(
      txHash,
      matchId
    );

    // Update the cached player row so /api/players/:address and
    // /api/leaderboard reflect this match immediately. The contract is
    // still the source of truth for XP/wins — this cache exists so the
    // frontend doesn't need to make a chain read on every page load.
    const xpGain = xpForResult(result);
    const winInc = result === "win" ? 1 : 0;
    const lossInc = result === "loss" ? 1 : 0;
    const drawInc = result === "draw" ? 1 : 0;

    const current = db
      .prepare(`SELECT xp FROM players WHERE address = ?`)
      .get(playerAddress.toLowerCase()) as { xp: number } | undefined;
    const newXp = (current?.xp ?? 0) + xpGain;

    db.prepare(
      `UPDATE players
       SET xp = ?, level = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?
       WHERE address = ?`
    ).run(newXp, levelForXp(newXp), winInc, lossInc, drawInc, playerAddress.toLowerCase());

    res.json({ txHash, status: "confirmed" });
  } catch (err) {
    if (err instanceof SponsorshipLimitError) {
      return res.status(429).json({ error: err.message });
    }
    if (err instanceof TreasuryLowBalanceError) {
      return res.status(503).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "relayer submission failed" });
  }
});
