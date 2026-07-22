import { Router } from "express";
import { db } from "../services/db.js";

export const playersRouter = Router();

playersRouter.get("/:address", (req, res) => {
  const address = req.params.address.toLowerCase();
  const player = db
    .prepare(
      `SELECT address, xp, level, wins, losses, draws FROM players WHERE address = ?`
    )
    .get(address);

  if (!player) {
    // Not an error — this address just hasn't played yet.
    return res.json({ address, xp: 0, level: 1, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 });
  }

  const p = player as { xp: number; level: number; wins: number; losses: number; draws: number };
  res.json({ ...p, address, gamesPlayed: p.wins + p.losses + p.draws });
});
