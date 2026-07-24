export const gameResultsAbi = [
  {
    type: "function",
    name: "submitMatch",
    inputs: [
      { name: "player", type: "address" },
      { name: "gameId", type: "bytes32" },
      { name: "result", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const leaderboardAbi = [
  {
    type: "function",
    name: "updateRanking",
    inputs: [{ name: "player", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
