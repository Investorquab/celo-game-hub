export type Choice = "rock" | "paper" | "scissors";

export const CHOICES: Choice[] = ["rock", "paper", "scissors"];

const BEATS: Record<Choice, Choice> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

const EMOJI: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

export function emojiFor(choice: Choice): string {
  return EMOJI[choice];
}

/** Returns "win" | "loss" | "draw" from the PLAYER's perspective. */
export function judge(playerChoice: Choice, aiChoice: Choice): "win" | "loss" | "draw" {
  if (playerChoice === aiChoice) return "draw";
  return BEATS[playerChoice] === aiChoice ? "win" : "loss";
}

export function getAiChoice(): Choice {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}
