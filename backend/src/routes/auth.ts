import { Router } from "express";
import { verifyMessage } from "viem";
import { db } from "../services/db.js";

export const authRouter = Router();

const nonces = new Map<string, { nonce: string; expiresAt: number }>();

authRouter.get("/nonce", (req, res) => {
  const address = String(req.query.address ?? "").toLowerCase();
  if (!address.startsWith("0x")) {
    return res.status(400).json({ error: "address query param required" });
  }
  const nonce = crypto.randomUUID();
  nonces.set(address, { nonce, expiresAt: Date.now() + 5 * 60 * 1000 });
  res.json({ nonce });
});

authRouter.post("/verify", async (req, res) => {
  const { address, message, signature } = req.body ?? {};
  if (!address || !message || !signature) {
    return res.status(400).json({ error: "address, message, signature required" });
  }

  const entry = nonces.get(String(address).toLowerCase());
  if (!entry || entry.expiresAt < Date.now() || !message.includes(entry.nonce)) {
    return res.status(401).json({ error: "invalid or expired nonce" });
  }

  const valid = await verifyMessage({ address, message, signature });
  if (!valid) {
    return res.status(401).json({ error: "signature verification failed" });
  }

  nonces.delete(String(address).toLowerCase());

  db.prepare(
    `INSERT INTO players (address, created_at) VALUES (?, ?)
     ON CONFLICT(address) DO NOTHING`
  ).run(address.toLowerCase(), Date.now());

  // In production, issue a short-lived session token (JWT) here.
  res.json({ ok: true, address });
});
