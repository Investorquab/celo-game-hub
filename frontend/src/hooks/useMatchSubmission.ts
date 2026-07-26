import { useState } from "react";
import { useAccount } from "wagmi";
import {
  signMessage,
  readContract,
  writeContract,
  waitForTransactionReceipt,
  switchChain,
  getAccount,
} from "wagmi/actions";
import { celo } from "wagmi/chains";
import { fetchMatchNonce, submitMatchResult, GameId } from "@/lib/relayerClient";
import { hydrateProfileFromBackend } from "@/lib/profileSync";
import { buildMatchMessage } from "@/lib/matchMessage";
import { wagmiConfig } from "@/lib/wagmi";
import { playerRegistryAbi } from "@/lib/playerRegistryAbi";
import type { TxState } from "@/components/TxConfirmation";

const PLAYER_REGISTRY_ADDRESS = import.meta.env.VITE_PLAYER_REGISTRY_CONTRACT as
  | `0x${string}`
  | undefined;

/**
 * Confirms the wallet has actually finished switching before we touch any
 * contract. `switchChain` can resolve a beat before the connector
 * (especially browser-extension wallets) has fully propagated the new
 * chain back to the page — proceeding immediately risks a ChainMismatchError.
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

/**
 * Shared match-submission flow for every game in the arcade: force the
 * wallet onto Celo, register the player on-chain if this is their first
 * ever match (one small real fee, once), sign the match result, and relay
 * it through the backend's gas-sponsored endpoint. Extracted from the
 * original Tic-Tac-Toe implementation so every new game gets the same
 * already-debugged chain-switch/registration/nonce handling rather than
 * a fresh copy that could reintroduce the same bugs.
 */
export function useMatchSubmission(gameId: GameId) {
  const { address } = useAccount();
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string>();

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

  async function submitResult(result: "win" | "loss" | "draw", boardHash: string) {
    try {
      // Force the wallet onto Celo before touching any contract, then
      // confirm the switch actually landed before proceeding — we
      // deliberately do NOT pass an explicit chainId to
      // writeContract/readContract below, since that triggers viem's
      // same-tick assertCurrentChain check, which is what fails on the
      // switch-then-immediately-transact race.
      if (getAccount(wagmiConfig).chainId !== celo.id) {
        setTxState("switching");
        await switchChain(wagmiConfig, { chainId: celo.id });
        await waitForChainSwitch(celo.id);
      }

      await ensureRegistered(address! as `0x${string}`);

      setTxState("signing");

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

      // The caller's own local score-tracking is just an optimistic
      // estimate for instant UI feedback. Now that the backend has
      // actually processed this match, pull the real numbers so they
      // don't silently drift from what's cached server-side.
      void hydrateProfileFromBackend(address!);
    } catch (err) {
      // Logged so it's actually possible to debug what failed.
      console.error("Match submission failed:", err);
      setTxState("failed");
    }
  }

  function reset() {
    setTxState("idle");
    setTxHash(undefined);
  }

  return { txState, txHash, submitResult, reset };
}
