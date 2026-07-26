import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAccount } from "wagmi";
import { Choice, CHOICES, emojiFor, getAiChoice, judge } from "@/lib/rockPaperScissors";
import { usePlayerStore } from "@/lib/playerStore";
import { useMatchSubmission } from "@/hooks/useMatchSubmission";
import { TxConfirmation } from "./TxConfirmation";

interface MatchRecord {
  id: string;
  result: "win" | "loss" | "draw";
  timestamp: number;
}

export function RockPaperScissors() {
  const { address, isConnected } = useAccount();
  const recordResult = usePlayerStore((s) => s.recordResult);
  const { txState, txHash, submitResult, reset } = useMatchSubmission("rock-paper-scissors");

  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [aiChoice, setAiChoice] = useState<Choice | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [history, setHistory] = useState<MatchRecord[]>([]);

  const result = playerChoice && aiChoice ? judge(playerChoice, aiChoice) : null;
  const roundOver = Boolean(result) && !revealing;

  function play(choice: Choice) {
    if (playerChoice) return;
    setPlayerChoice(choice);
    setRevealing(true);

    const picked = getAiChoice();
    setTimeout(() => {
      setAiChoice(picked);
      setRevealing(false);
    }, 700);
  }

  useEffect(() => {
    if (!roundOver || !result) return;

    setHistory((h) => [{ id: crypto.randomUUID(), result, timestamp: Date.now() }, ...h].slice(0, 10));
    recordResult(result);

    if (result === "win") {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#35D07F", "#4B8BFF", "#8C5CF5"] });
    }

    if (isConnected && address && playerChoice && aiChoice) {
      const boardHash = `0x${playerChoice}-vs-${aiChoice}`;
      void submitResult(result, boardHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOver]);

  function playAgain() {
    setPlayerChoice(null);
    setAiChoice(null);
    reset();
  }

  const resultCopy =
    result === "win" ? "You won 🎉" : result === "loss" ? "AI won this round" : result === "draw" ? "Draw" : null;

  return (
    <div className="glass-card shadow-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">Rock Paper Scissors</h2>
        <span className="pill bg-white/5 text-arcade-muted">Player vs AI</span>
      </div>

      <div className="flex items-center justify-center gap-6 py-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-arcade-muted">You</p>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-4xl">
            <AnimatePresence mode="wait">
              {playerChoice && (
                <motion.span
                  key={playerChoice}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  {emojiFor(playerChoice)}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <span className="font-display text-lg text-arcade-muted">vs</span>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-arcade-muted">AI</p>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-4xl">
            {revealing ? (
              <motion.span
                className="h-6 w-6 rounded-full border-2 border-arcade-purple border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
              />
            ) : (
              <AnimatePresence mode="wait">
                {aiChoice && (
                  <motion.span
                    key={aiChoice}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  >
                    {emojiFor(aiChoice)}
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {!playerChoice && (
        <div className="grid grid-cols-3 gap-2">
          {CHOICES.map((choice) => (
            <button
              key={choice}
              onClick={() => play(choice)}
              className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-3xl transition hover:border-arcade-purple/40 hover:bg-arcade-purple/5"
            >
              {emojiFor(choice)}
              <span className="text-xs capitalize text-arcade-muted">{choice}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-arcade-muted">
          {resultCopy ?? (revealing ? "Revealing..." : "Pick rock, paper, or scissors")}
        </p>
        {roundOver && (
          <button onClick={playAgain} className="btn-primary text-xs">
            Play again
          </button>
        )}
      </div>

      {isConnected ? (
        <TxConfirmation state={txState} txHash={txHash} />
      ) : roundOver ? (
        <p className="mt-4 text-xs text-arcade-muted">
          Connect your wallet to save this result on-chain.
        </p>
      ) : null}

      {history.length > 0 && (
        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-arcade-muted">Match history</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((m) => (
              <span
                key={m.id}
                className={`pill ${
                  m.result === "win"
                    ? "bg-arcade-green/10 text-arcade-green"
                    : m.result === "loss"
                      ? "bg-red-400/10 text-red-300"
                      : "bg-white/5 text-arcade-muted"
                }`}
              >
                {m.result.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
