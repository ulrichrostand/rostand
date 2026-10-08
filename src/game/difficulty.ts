import type { GuardTuning } from "../entities/guard";

export interface MissionDifficulty {
  mapWidth: number;
  mapHeight: number;
  guardCount: number;
  /** Caméras de surveillance : aucune pendant l'introduction, puis de plus en plus nombreuses. */
  cameraCount: number;
  guardTuning: GuardTuning;
  lives: number;
}

const DEGREES = Math.PI / 180;

/**
 * Courbe de difficulté : le jeu suit la progression de la roadmap,
 * les derniers modules (plus avancés) sont aussi les plus durs à infiltrer.
 */
export function difficultyForModule(moduleIndex: number): MissionDifficulty {
  const level = Math.max(0, moduleIndex);
  return {
    mapWidth: 35 + level,
    mapHeight: 27 + Math.floor(level / 2),
    guardCount: 2 + Math.floor(level * 0.3),
    cameraCount: level === 0 ? 0 : Math.min(4, 1 + Math.floor(level / 4)),
    lives: 3,
    guardTuning: {
      walkSpeed: 1.3 + level * 0.04,
      visionRange: 5 + level * 0.12,
      fieldOfViewRadians: (70 + level) * DEGREES,
      detectionRate: 0.8 + level * 0.04,
    },
  };
}
