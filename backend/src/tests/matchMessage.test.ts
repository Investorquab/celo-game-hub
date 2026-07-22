import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMatchMessage,
  issueMatchNonce,
  peekMatchNonce,
  consumeMatchNonce,
} from "../lib/matchMessage.js";

test("buildMatchMessage is deterministic for the same inputs", () => {
  const params = {
    playerAddress: "0xAbC0000000000000000000000000000000000A",
    gameId: "tic-tac-toe",
    result: "win" as const,
    boardHash: "0xX-O------",
    nonce: "fixed-nonce",
  };
  assert.equal(buildMatchMessage(params), buildMatchMessage(params));
});

test("buildMatchMessage changes if result changes", () => {
  const base = {
    playerAddress: "0xAbC0000000000000000000000000000000000A",
    gameId: "tic-tac-toe",
    boardHash: "0xX-O------",
    nonce: "fixed-nonce",
  };
  const win = buildMatchMessage({ ...base, result: "win" });
  const loss = buildMatchMessage({ ...base, result: "loss" });
  assert.notEqual(win, loss);
});

test("nonce lifecycle: issue -> peek -> consume -> gone", () => {
  const address = "0xDeF0000000000000000000000000000000000B";
  const nonce = issueMatchNonce(address);
  assert.equal(peekMatchNonce(address), nonce);
  consumeMatchNonce(address);
  assert.equal(peekMatchNonce(address), null);
});

test("consumed nonce cannot be replayed", () => {
  const address = "0x1111111111111111111111111111111111111C";
  issueMatchNonce(address);
  consumeMatchNonce(address);
  assert.equal(peekMatchNonce(address), null, "nonce should not be reusable after consumption");
});
