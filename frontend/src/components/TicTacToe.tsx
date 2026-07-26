import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAccount } from "wagmi";
import { Board, checkWinner, getAiMove, isDraw } from "@/lib/ticTacToe";
import { usePlayerStore } from "@/lib/playerStore";
import { useMatchSubmission } from "@/hooks/useMatchSubmission";
import { TxConfirmation } from "./TxConfirmation";

interface MatchRecord {
  id: string;
  result: "win" | "loss" | "draw";
  timestamp: number;
}

const EMPTY_BOARD: Board = Array(9).fill(null);
const PLAYER_SYMBOL = "X";
const AI_SYMBOL = "O";

export function TicTacToe() {
  const { address, isConnected } = useAccount();
  const recordResult = usePlayerStore((s) => s.recordResult);
  const { txState, txHash, submitResult, reset } = useMatchSubmission("tic-tac-toe");

  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [history, setHistory] = useState<MatchRecord[]>([]);

  const { winner, line } = checkWinner(board);
  const draw = isDraw(board);
  const gameOver = Boolean(winner) || draw;

  useEffect(() => {
    if (!isAiTurn || gameOver) return;
    const move = getAiMove(board, AI_SYMBOL, "medium");
    const timeout = setTimeout(() => {
      setBoard((prev) => {
        if (move === -1 || prev[move] !== null) return prev;
        const next = [...prev];
        next[move] = AI_SYMBOL;
        return next;
      });
      setIsAiTurn(false);
    }, 450);
    return () => clearTimeout(timeout);
  }, [isAiTurn, board, gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    const result: "win" | "loss" | "draw" =
      winner === PLAYER_SYMBOL ? "win" : winner === AI_SYMBOL ? "loss" : "draw";

    setHistory((h) => [{ id: crypto.randomUUID(), result, timestamp: Date.now() }, ...h].slice(0, 10));
    recordResult(result);

    if (result === "win") {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#35D07F", "#4B8BFF", "#8C5CF5"] });
    }

    if (isConnected && address) {
      const boardHash = `0x${board.map((c) => c ?? "-").join("")}`;
      void submitResult(result, boardHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function handleCellClick(index: number) {
    if (board[index] !== null || gameOver || isAiTurn) return;
    const next = [...board];
    next[index] = PLAYER_SYMBOL;
    setBoard(next);
    setIsAiTurn(true);
  }

  function restart() {
    setBoard(EMPTY_BOARD);
    setIsAiTurn(false);
    reset();
  }

  return (
    <div className="glass-card shadow-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">Tic-Tac-Toe</h2>
        <span className="pill bg-white/5 text-arcade-muted">Player vs AI</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => {
          const isWinningCell = line?.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={cell !== null || gameOver || isAiTurn}
              className={`flex aspect-square items-center justify-center rounded-2xl border text-3xl font-semibold transition-colors ${
                isWinningCell
                  ? "border-arcade-green/60 bg-arcade-green/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <AnimatePresence>
                {cell && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className={cell === "X" ? "text-arcade-blue" : "text-arcade-purple"}
                  >
                    {cell}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-arcade-muted">
          {gameOver
            ? winner
              ? winner === PLAYER_SYMBOL
                ? "You won 🎉"
                : "AI won this round"
              : "Draw"
            : isAiTurn
              ? "AI is thinking..."
              : "Your move (X)"}
        </p>
        {gameOver && (
          <button onClick={restart} className="btn-primary text-xs">
            Play again
          </button>
        )}
      </div>

      {isConnected ? (
        <TxConfirmation state={txState} txHash={txHash} />
      ) : gameOver ? (
        <p className="mt-4 text-xs text-arcade-muted">
          Connect your wallet to save this result on-chain.
        </p>
      ) : null}

      {history.length > 0 && (
        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-arcade-muted">
            Match history
          </p>
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
