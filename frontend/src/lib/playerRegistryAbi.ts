export const playerRegistryAbi = [
  {
    type: "function",
    name: "register",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPlayer",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "registered", type: "bool" },
          { name: "xp", type: "uint64" },
          { name: "level", type: "uint32" },
          { name: "wins", type: "uint32" },
          { name: "losses", type: "uint32" },
          { name: "draws", type: "uint32" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;
