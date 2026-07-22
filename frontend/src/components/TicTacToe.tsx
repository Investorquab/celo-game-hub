import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAccount } from "wagmi";
import { signMessage, readContract, writeContract, waitForTransactionReceipt, switchChain, getAccount } from "wagmi/actions";
import { celo } from "wagmi/chains";
import { Board, checkWinner, getAiMove, isDraw } from "@/lib/ticTacToe";
import { usePlayerStore } from "@/lib/playerStore";
import { fetchMatchNonce, submitMatchResult } from "@/lib/relayerClient";
import { hydrateProfileFromBackend } from "@/lib/profileSync";
import { buildMatchMessage } from "@/lib/matchMessage";
import { wagmiConfig } from "@/lib/wagmi";
import { playerRegistryAbi } from "@/lib/playerRegistryAbi";
import { TxConfirmation, TxState } from "./TxConfirmation";

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

  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string>();

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
      void submitResult(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const PLAYER_REGISTRY_ADDRESS = import.meta.env.VITE_PLAYER_REGISTRY_CONTRACT as
    | `0x${string}`
    | undefined;

  /**
   * One-time on-chain registration check. PlayerRegistry.recordMatchResult
   * reverts with NotRegistered() for any address that hasn't called
   * register() — this makes sure that's happened before we ever try to
   * submit a match for this wallet. Costs the player a small, real gas fee
   * ONCE; every match after that stays fully sponsored.
   */
  async function ensureRegistered(playerAddress: `0x${string}`) {
    if (!PLAYER_REGISTRY_ADDRESS) {
      throw new Error("VITE_PLAYER_REGISTRY_CONTRACT is not configured");
    }

    const player = await readContract(wagmiConfig, {
      address: PLAYER_REGISTRY_ADDRESS,
      abi: playerRegistryAbi,
      functionName: "getPlayer",
      args: [playerAddress],
    });

    if (player.registered) return;

    setTxState("registering");
    const hash = await writeContract(wagmiConfig, {
      address: PLAYER_REGISTRY_ADDRESS,
      abi: playerRegistryAbi,
      functionName: "register",
    });
    await waitForTransactionReceipt(wagmiConfig, { hash });
  }

  /**
   * Confirms the wallet has actually finished switching before we touch
   * any contract. `switchChain` can resolve a beat before the connector
   * (especially browser-extension wallets) has fully propagated the new
   * chain back to the page — proceeding immediately risks the exact
   * ChainMismatchError this loop exists to avoid.
   */
  async function waitForChainSwitch(targetChainId: number, timeoutMs = 5000) {
    const start = Date.now();
    while (getAccount(wagmiConfig).chainId !== targetChainId) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(
          "Wallet did not finish switching to Celo — please switch networks manually and try again."
        );
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async function submitResult(result: "win" | "loss" | "draw") {
    try {
      // Force the wallet onto Celo before touching any contract, then
      // confirm the switch actually landed (see waitForChainSwitch) before
      // proceeding — we deliberately do NOT pass an explicit chainId to
      // writeContract/readContract below, since that triggers viem's
      // same-tick assertCurrentChain check, which is what was failing on
      // the switch-then-immediately-transact race.
      if (getAccount(wagmiConfig).chainId !== celo.id) {
        setTxState("switching");
        await switchChain(wagmiConfig, { chainId: celo.id });
        await waitForChainSwitch(celo.id);
      }

      await ensureRegistered(address! as `0x${string}`);

      setTxState("signing");
      const boardHash = `0x${board.map((c) => c ?? "-").join("")}`;
      const gameId = "tic-tac-toe" as const;

      // 1. Get a single-use nonce from the backend.
      const nonce = await fetchMatchNonce(address!);

      // 2. Build the exact same message the backend will reconstruct and
      //    verify against — must stay in sync with backend/src/lib/matchMessage.ts.
      const message = buildMatchMessage({ playerAddress: address!, gameId, result, boardHash, nonce });

      // 3. Ask the wallet to sign it. This is what proves the player, not
      //    just anyone who knows their address, is attesting to this result.
      const signature = await signMessage(wagmiConfig, { message, account: address! });

      setTxState("relaying");
      const res = await submitMatchResult({
        playerAddress: address!,
        gameId,
        result,
        boardHash,
        signature,
      });
      setTxHash(res.txHash);
      setTxState("confirmed");

      // The local `recordResult` call (below, in the gameOver effect) is
      // just an optimistic estimate for instant UI feedback. Now that the
      // backend has actually processed this match, pull the real numbers
      // so they don't silently drift from what's cached server-side.
      void hydrateProfileFromBackend(address!);
    } catch (err) {
      // Logged so it's actually possible to debug what failed — previously
      // this swallowed the real error entirely.
      console.error("Match submission failed:", err);
      setTxState("failed");
    }
  }

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
    setTxState("idle");
    setTxHash(undefined);
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
