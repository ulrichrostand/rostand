export const POINTS_PER_TERMINAL = 100;
/** Chaque tentative ratée coûte des points : on récompense la compréhension, pas le hasard. */
export const PENALTY_PER_WRONG_ATTEMPT = 40;
export const PENALTY_PER_DETECTION = 75;
export const STEALTH_BONUS = 150;
export const MIN_POINTS_PER_TERMINAL = 20;
/** Ramasser les dossiers est récompensé : c'est là que se trouvent les leçons. */
export const POINTS_PER_INTEL = 20;

export interface MissionStats {
  terminalCount: number;
  wrongAttemptsPerTerminal: number[];
  detections: number;
  elapsedSeconds: number;
  intelCollected: number;
  intelTotal: number;
}

export interface MissionScore {
  score: number;
  maxScore: number;
  stars: 1 | 2 | 3;
  ghost: boolean;
  firstTryAccuracy: number;
}

export function computeMissionScore(stats: MissionStats): MissionScore {
  const terminalPoints = stats.wrongAttemptsPerTerminal.reduce(
    (total, wrongAttempts) =>
      total + Math.max(MIN_POINTS_PER_TERMINAL, POINTS_PER_TERMINAL - wrongAttempts * PENALTY_PER_WRONG_ATTEMPT),
    0,
  );
  const ghost = stats.detections === 0;
  const intelPoints = stats.intelCollected * POINTS_PER_INTEL;
  const score = Math.max(
    0,
    terminalPoints + intelPoints - stats.detections * PENALTY_PER_DETECTION + (ghost ? STEALTH_BONUS : 0),
  );
  const maxScore = stats.terminalCount * POINTS_PER_TERMINAL + stats.intelTotal * POINTS_PER_INTEL + STEALTH_BONUS;
  const firstTryCount = stats.wrongAttemptsPerTerminal.filter((wrongAttempts) => wrongAttempts === 0).length;
  const firstTryAccuracy = stats.terminalCount === 0 ? 0 : firstTryCount / stats.terminalCount;
  const ratio = maxScore === 0 ? 0 : score / maxScore;
  const stars = ratio >= 0.85 ? 3 : ratio >= 0.55 ? 2 : 1;
  return { score, maxScore, stars, ghost, firstTryAccuracy };
}
