# Celo Arcade — Game Hub

A premium on-chain gaming platform, **live on Celo mainnet**. First live
game: Tic-Tac-Toe (Player vs AI), with gas-sponsored match recording so
players don't need to hold CELO to play (after one small one-time
registration transaction — see below).

## Live mainnet deployment

| Contract | Address |
|---|---|
| `PlayerRegistry` | [`0x786F4ECA32F580687316e3535B1B1F1D4285852B`](https://celoscan.io/address/0x786F4ECA32F580687316e3535B1B1F1D4285852B) |
| `GameResults` | [`0xacfa4c8c51F5acF50cBccf8014c0c7568d883210`](https://celoscan.io/address/0xacfa4c8c51F5acF50cBccf8014c0c7568d883210) |
| `Leaderboard` | [`0x8d064accAfa33197c2c3611480E3F87d674b4dc8`](https://celoscan.io/address/0x8d064accAfa33197c2c3611480E3F87d674b4dc8) |
| Relayer wallet (sponsors gas) | [`0x14389bb34cDBAEff82cBb48303D221ca6e0e9c4c`](https://celoscan.io/address/0x14389bb34cDBAEff82cBb48303D221ca6e0e9c4c) |

Chain: Celo Mainnet (id `42220`). Keep the relayer wallet topped up with
CELO — it pays gas for every sponsored match submission and the backend
refuses to sponsor if its balance drops too low.

## Structure

```
celo-game-hub/
├── frontend/    React + Vite + TS + Tailwind + Framer Motion
├── backend/     Express relayer/API service (Node + TypeScript)
└── contracts/   Solidity contracts (Foundry)
```

## Status

Working and deployed to mainnet, but still worth reading this list before
you treat it as a finished product:

- ✅ Frontend: home screen, wallet connect, live profile/XP display, live
  leaderboard, game grid, fully playable Tic-Tac-Toe vs AI (minimax) with
  win/draw detection, animations, confetti, transaction-confirmation UI,
  and automatic wrong-network detection/switching.
- ✅ Backend: nonce-based match-signature verification, relayer with daily
  per-player sponsorship limits + treasury balance check, SQLite cache for
  player stats and leaderboard, chain-switchable via one env var
  (`CELO_CHAIN=sepolia` or `mainnet`).
- ✅ Contracts: `PlayerRegistry`, `GameResults`, `Leaderboard`, deployed and
  verified on mainnet (see table above), Foundry unit tests, deploy script.
- ✅ **Match signature verification**: the backend issues a single-use
  nonce, the frontend gets the wallet to sign a canonical match message,
  and the backend verifies that signature before the relayer ever touches
  the chain. Nonce is consumed on use (`backend/src/lib/matchMessage.ts`,
  `backend/src/routes/matches.ts`).
- ✅ **First-match registration**: `GameResults.submitMatch` requires the
  player to have called `PlayerRegistry.register()` first. The frontend
  checks this and, if needed, has the player's own wallet send one small,
  real registration transaction before their first match
  (`frontend/src/components/TicTacToe.tsx`'s `ensureRegistered`). This
  costs a trivial amount of gas **once, ever**; every match after that,
  for that wallet, is fully sponsored.
- ✅ **Network enforcement**: the app actively switches the connected
  wallet to Celo mainnet before any contract interaction, waits for the
  switch to actually land (avoiding a real race condition we hit during
  testing — see `waitForChainSwitch` in `TicTacToe.tsx`), and shows a
  persistent banner (`NetworkGuard.tsx`) if the wallet is ever on the
  wrong chain.
- ✅ **Live profile + leaderboard**: the backend now updates each player's
  cached XP/wins/losses/draws immediately after a match confirms
  on-chain (`backend/src/lib/xp.ts`, mirrors `PlayerRegistry.sol`'s math
  exactly — keep both in sync if you ever change one). The frontend
  hydrates a player's profile from the backend on wallet connect and
  again right after each match confirms, so XP survives a page refresh
  instead of living only in memory. `LeaderboardCard.tsx` displays the
  top 10 players by XP on the home screen, live from
  `GET /api/leaderboard`.
- ⚠️ Not yet done: an on-chain indexer that calls
  `Leaderboard.updateRanking` after each match (the on-chain `Leaderboard`
  contract itself is currently unused — all live leaderboard/profile data
  comes from the backend's SQLite cache, which is accurate but is a
  second source of truth alongside the chain, not derived from it). Also
  still missing: a JWT/session layer after sign-in (every state-changing
  call re-proves identity via its own signed message, which is safe but
  chattier than a session would be).
- ⚠️ Contracts are functional and tested but **not externally audited**.
  Treat them as a solid starting point, not a guarantee of security for
  high-value usage.

## Setup (local development / testnet)

### 1. Contracts

```bash
cd contracts
forge install foundry-rs/forge-std
cp .env.example .env   # fill in DEPLOYER_PRIVATE_KEY + RELAYER_ADDRESS
forge build
forge test
forge script script/Deploy.s.sol --rpc-url celo-sepolia --broadcast
```

Get testnet CELO from the [Celo Sepolia faucet](https://faucet.celo.org/celo-sepolia).
(Alfajores was retired in 2025/2026 — Celo Sepolia, chain id `11142220`, is
the current testnet. Mainnet, `forno.celo.org` / chain `42220`, was
unaffected by that migration.)

To deploy to mainnet instead: same script, `--rpc-url celo`. **Always run
it once without `--broadcast` first** — that's a free dry run showing
exact gas cost before you spend anything real.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in CELO_CHAIN, CELO_RPC_URL, RELAYER_PRIVATE_KEY, and the three
# contract addresses. Use the mainnet table above for production, or your
# own Celo Sepolia deployment for testing.
npm run build
npm test
npm run dev
```

Startup log tells you exactly which chain you're pointed at — check this
every time, especially before testing with real funds.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_BASE_URL and VITE_PLAYER_REGISTRY_CONTRACT are required.
npm run dev
```

Visit http://localhost:5173.

## Gas sponsorship model

Players connect their wallet (no gas). The first time they play, they send
one small real transaction to register on-chain. Every match after that:
they sign a message (still no gas), the frontend sends it to the backend,
and the backend acts as a relayer — paying gas from the treasury wallet
and submitting `GameResults.submitMatch`. Limits enforced in
`backend/src/relayer/relayerService.ts`:

- `MAX_SPONSORED_TX_PER_PLAYER_PER_DAY` — per-address daily cap
- `MAX_GAS_LIMIT_WEI` — per-transaction gas ceiling
- Treasury balance check before every submission

## Contracts

| Contract | Responsibility |
|---|---|
| `PlayerRegistry.sol` | Registration, XP, level, achievements |
| `GameResults.sol` | Match history, forwards XP updates, relayer-gated |
| `Leaderboard.sol` | Bounded top-N ranking by XP (not yet indexed — see Status) |

Not externally audited. Treat as a functional, tested starting point.

## Deployment

- **Backend**: designed to run as a single lightweight Node process with
  embedded SQLite — no separate database server needed. Fits comfortably
  on a small VPS alongside other services. Just needs Node installed,
  `npm install && npm run build && npm start`, and a process manager
  (e.g. `pm2` or a systemd unit) to keep it running and restart on reboot.
- **Frontend**: a static Vite build (`npm run build` outputs to `dist/`).
  Deploys cleanly to Vercel (set project root to `frontend/`) or can be
  served as static files from the same VPS as the backend — either works,
  Vercel is just less setup if you want it free and fast.
