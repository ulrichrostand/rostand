import type { Challenge, CommandChallenge, ChoiceChallenge, OrderChallenge } from "../content/types";

/** Réponse du joueur, typée selon le défi. */
export type ChallengeAnswer =
  | { kind: "choice"; selectedIndex: number }
  | { kind: "command"; typedCommand: string }
  | { kind: "order"; orderedSteps: string[] };

const MAX_COMMAND_LENGTH = 300;

/**
 * Normalise une commande pour comparer l'intention, pas la forme :
 * espaces multiples, guillemets simples/doubles et préfixe `sudo` n'ont pas d'impact.
 */
export function normalizeCommand(rawCommand: string): string {
  return rawCommand
    .slice(0, MAX_COMMAND_LENGTH)
    .trim()
    .replace(/^\$\s*/, "")
    .replace(/^sudo\s+/, "")
    .replace(/["'`]/g, '"')
    .replace(/\s+/g, " ");
}

function isCommandCorrect(challenge: CommandChallenge, typedCommand: string): boolean {
  const normalized = normalizeCommand(typedCommand);
  if (normalized.length === 0) return false;
  return challenge.acceptedAnswers.some((accepted) => normalizeCommand(accepted) === normalized);
}

function isChoiceCorrect(challenge: ChoiceChallenge, selectedIndex: number): boolean {
  return selectedIndex === challenge.correctIndex;
}

function isOrderCorrect(challenge: OrderChallenge, orderedSteps: string[]): boolean {
  return (
    orderedSteps.length === challenge.steps.length &&
    orderedSteps.every((step, index) => step === challenge.steps[index])
  );
}

export function isAnswerCorrect(challenge: Challenge, answer: ChallengeAnswer): boolean {
  if (challenge.kind !== answer.kind) {
    throw new TypeError(`Réponse de type « ${answer.kind} » pour un défi « ${challenge.kind} »`);
  }
  switch (challenge.kind) {
    case "choice":
      return isChoiceCorrect(challenge, (answer as Extract<ChallengeAnswer, { kind: "choice" }>).selectedIndex);
    case "command":
      return isCommandCorrect(challenge, (answer as Extract<ChallengeAnswer, { kind: "command" }>).typedCommand);
    case "order":
      return isOrderCorrect(challenge, (answer as Extract<ChallengeAnswer, { kind: "order" }>).orderedSteps);
  }
}
