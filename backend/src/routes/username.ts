import { Router } from "express";
import { verifyMessage } from "viem";
import { db } from "../services/db.js";
import {
  buildUsernameMessage,
  consumeUsernameNonce,
  isValidUsername,
  issueUsernameNonce,
  peekUsernameNonce,
} from "../lib/usernameMessage.js";

export const usernameRouter = Router();

/** Step 1: frontend calls this before asking the wallet to sign. */
usernameRouter.get("/nonce", (req, res) => {
  const address = String(req.query.address ?? "");
  if (!address.startsWith("0x")) {
    return res.status(400).json({ error: "address query param required" });
  }
  const nonce = issueUsernameNonce(address);
  res.json({ nonce });
});

/** Step 2: frontend submits the signed username choice here. */
usernameRouter.post("/", async (req, res) => {
  const { address, username, signature } = req.body ?? {};

  if (!address || typeof address !== "string" || !address.startsWith("0x")) {
    return res.status(400).json({ error: "valid address required" });
  }
  if (!username || typeof username !== "string" || !isValidUsername(username)) {
    return res.status(400).json({
      error: "username must be 3-20 characters, letters/numbers/underscore only",
    });
  }
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ error: "signature required" });
  }

  const nonce = peekUsernameNonce(address);
  if (!nonce) {
    return res.status(401).json({ error: "missing or expired nonce — call GET /api/username/nonce first" });
  }

  const message = buildUsernameMessage({ address, username, nonce });

  let signatureValid = false;
  try {
    signatureValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    return res.status(401).json({ error: "signature does not match the claimed username" });
  }

  consumeUsernameNonce(address);

  const addressLower = address.toLowerCase();

  try {
    db.prepare(
      `INSERT INTO players (address, username, created_at) VALUES (?, ?, ?)
       ON CONFLICT(address) DO UPDATE SET username = excluded.username`
    ).run(addressLower, username, Date.now());
    res.json({ ok: true, address: addressLower, username });
  } catch (err) {
    // The unique index (COLLATE NOCASE) throws here if the name is taken.
    res.status(409).json({ error: "that username is already taken" });
  }
});

/** Look up a player by username (case-insensitive) — for search/profile links. */
usernameRouter.get("/:username", (req, res) => {
  const player = db
    .prepare(
      `SELECT address, username, xp, level, wins, losses, draws
       FROM players WHERE username = ? COLLATE NOCASE`
    )
    .get(req.params.username);

  if (!player) {
    return res.status(404).json({ error: "no player with that username" });
  }

  res.json(player);
});
