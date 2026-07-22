export type Cell = "X" | "O" | null;
export type Board = Cell[];

export const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

export function isDraw(board: Board): boolean {
  return board.every((cell) => cell !== null) && !checkWinner(board).winner;
}

/**
 * Minimax-based AI move. Difficulty scales the chance the AI picks a random
 * legal move instead of the optimal one, so it doesn't play unbeatably every
 * time.
 */
export function getAiMove(board: Board, aiSymbol: "X" | "O", difficulty: "easy" | "medium" | "hard" = "medium"): number {
  const empty = board.reduce<number[]>((acc, c, i) => (c === null ? [...acc, i] : acc), []);
  if (empty.length === 0) return -1;

  const randomChance = difficulty === "easy" ? 0.6 : difficulty === "medium" ? 0.25 : 0;
  if (Math.random() < randomChance) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  const humanSymbol = aiSymbol === "X" ? "O" : "X";

  function minimax(b: Board, isAiTurn: boolean): number {
    const { winner } = checkWinner(b);
    if (winner === aiSymbol) return 10;
    if (winner === humanSymbol) return -10;
    if (isDraw(b)) return 0;

    const scores: number[] = [];
    for (let i = 0; i < b.length; i++) {
      if (b[i] === null) {
        const next = [...b];
        next[i] = isAiTurn ? aiSymbol : humanSymbol;
        scores.push(minimax(next, !isAiTurn));
      }
    }
    return isAiTurn ? Math.max(...scores) : Math.min(...scores);
  }

  let bestScore = -Infinity;
  let bestMove = empty[0];
  for (const i of empty) {
    const next = [...board];
    next[i] = aiSymbol;
    const score = minimax(next, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}
