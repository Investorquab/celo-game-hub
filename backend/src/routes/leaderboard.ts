import { Router } from "express";
import { db } from "../services/db.js";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", (_req, res) => {
  const top = db
    .prepare(
      `SELECT address, xp, level, wins, losses, draws
       FROM players ORDER BY xp DESC LIMIT 100`
    )
    .all();
  res.json({ leaderboard: top });
});
