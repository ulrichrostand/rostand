export interface ModuleRecord {
  bestScore: number;
  stars: 1 | 2 | 3;
  ghost: boolean;
  completedAt: string;
}

/** Meilleure note obtenue à un examen (clé : id du module, ou « general »). */
export interface ExamRecord {
  /** Note sur 20, au demi-point près. */
  bestGrade: number;
  attempts: number;
  lastTakenAt: string;
}

/** État d'une mission en cours, enregistré à chaque étape importante pour pouvoir la reprendre. */
export interface MissionCheckpoint {
  moduleId: string;
  hackedTerminals: number[];
  wrongAttemptsPerTerminal: number[];
  collectedIntel: number[];
  readLessons: number[];
  neutralizedGuards: number[];
  firewalledCameras: number[];
  charges: number;
  ammo: number;
  livesLeft: number;
  detections: number;
  neutralizations: number;
  elapsedSeconds: number;
  playerCell: { x: number; z: number };
  /** Version de la génération des niveaux : un point de reprise d'une autre version ne correspond plus à la carte. */
  layoutVersion: number;
  savedAt: string;
}

/** À incrémenter dès que la génération des niveaux change (nombre de terminaux, caméras...). */
export const LEVEL_LAYOUT_VERSION = 2;

export interface PlayerProgress {
  version: 2;
  records: Record<string, ModuleRecord>;
  /** Absent des sauvegardes antérieures au mode examen : lu comme vide. */
  exams: Record<string, ExamRecord>;
  checkpoint: MissionCheckpoint | null;
  savedAt: string | null;
}

const STORAGE_KEY = "shadow-ops-devops/progress";
/** Bornes de validation : une sauvegarde vient potentiellement d'un code collé par l'utilisateur. */
const MAX_INDEX = 63;
const MAX_COUNTER = 10_000;
const MAX_ID_LENGTH = 64;
const SAFE_ID = /^[a-z0-9-]{1,64}$/;

export function emptyProgress(): PlayerProgress {
  return { version: 2, records: Object.create(null), exams: Object.create(null), checkpoint: null, savedAt: null };
}

/** Interface minimale de stockage : permet d'injecter un faux stockage dans les tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecordObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
}

function isModuleRecord(candidate: unknown): candidate is ModuleRecord {
  if (!isRecordObject(candidate)) return false;
  return (
    typeof candidate.bestScore === "number" &&
    Number.isFinite(candidate.bestScore) &&
    candidate.bestScore >= 0 &&
    (candidate.stars === 1 || candidate.stars === 2 || candidate.stars === 3) &&
    typeof candidate.ghost === "boolean" &&
    typeof candidate.completedAt === "string" &&
    candidate.completedAt.length <= MAX_ID_LENGTH
  );
}

function isExamRecord(candidate: unknown): candidate is ExamRecord {
  if (!isRecordObject(candidate)) return false;
  return (
    typeof candidate.bestGrade === "number" &&
    Number.isFinite(candidate.bestGrade) &&
    candidate.bestGrade >= 0 &&
    candidate.bestGrade <= 20 &&
    isBoundedInteger(candidate.attempts, MAX_COUNTER) &&
    typeof candidate.lastTakenAt === "string" &&
    candidate.lastTakenAt.length <= MAX_ID_LENGTH
  );
}

function isBoundedInteger(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
}

function isIndexList(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= MAX_INDEX + 1 && value.every((item) => isBoundedInteger(item, MAX_INDEX));
}

/** Validation stricte : toute incohérence invalide le point de reprise (on perd une mission, jamais la campagne). */
export function parseCheckpoint(candidate: unknown): MissionCheckpoint | null {
  if (!isRecordObject(candidate)) return null;
  const playerCell = candidate.playerCell;
  const valid =
    typeof candidate.moduleId === "string" &&
    SAFE_ID.test(candidate.moduleId) &&
    isIndexList(candidate.hackedTerminals) &&
    isIndexList(candidate.collectedIntel) &&
    isIndexList(candidate.readLessons) &&
    isIndexList(candidate.neutralizedGuards) &&
    isIndexList(candidate.firewalledCameras) &&
    isBoundedInteger(candidate.ammo, 99) &&
    Array.isArray(candidate.wrongAttemptsPerTerminal) &&
    candidate.wrongAttemptsPerTerminal.length <= MAX_INDEX + 1 &&
    candidate.wrongAttemptsPerTerminal.every((item) => isBoundedInteger(item, MAX_COUNTER)) &&
    isBoundedInteger(candidate.charges, 99) &&
    isBoundedInteger(candidate.livesLeft, 9) &&
    (candidate.livesLeft as number) > 0 &&
    isBoundedInteger(candidate.detections, MAX_COUNTER) &&
    isBoundedInteger(candidate.neutralizations, MAX_COUNTER) &&
    typeof candidate.elapsedSeconds === "number" &&
    Number.isFinite(candidate.elapsedSeconds) &&
    candidate.elapsedSeconds >= 0 &&
    isRecordObject(playerCell) &&
    isBoundedInteger(playerCell.x, 512) &&
    isBoundedInteger(playerCell.z, 512) &&
    (candidate.layoutVersion === undefined || isBoundedInteger(candidate.layoutVersion, 999)) &&
    typeof candidate.savedAt === "string" &&
    candidate.savedAt.length <= MAX_ID_LENGTH;
  if (!valid) return null;
  // Copie champ par champ : aucune propriété inattendue ne survit à la validation.
  return {
    moduleId: candidate.moduleId as string,
    hackedTerminals: [...(candidate.hackedTerminals as number[])],
    wrongAttemptsPerTerminal: [...(candidate.wrongAttemptsPerTerminal as number[])],
    collectedIntel: [...(candidate.collectedIntel as number[])],
    readLessons: [...(candidate.readLessons as number[])],
    neutralizedGuards: [...(candidate.neutralizedGuards as number[])],
    firewalledCameras: [...(candidate.firewalledCameras as number[])],
    ammo: candidate.ammo as number,
    charges: candidate.charges as number,
    livesLeft: candidate.livesLeft as number,
    detections: candidate.detections as number,
    neutralizations: candidate.neutralizations as number,
    elapsedSeconds: candidate.elapsedSeconds as number,
    playerCell: { x: (playerCell as { x: number }).x, z: (playerCell as { z: number }).z },
    // Absent = sauvegarde antérieure à ce champ, donc version 1.
    layoutVersion: (candidate.layoutVersion as number | undefined) ?? 1,
    savedAt: candidate.savedAt as string,
  };
}

/**
 * Le localStorage et les codes de sauvegarde sont modifiables par l'utilisateur :
 * on valide la forme au lieu de faire confiance à JSON.parse, et on ignore les entrées corrompues.
 * Accepte l'ancien format (version 1, sans point de reprise).
 */
export function progressFromUnknown(parsed: unknown): PlayerProgress {
  if (!isRecordObject(parsed)) return emptyProgress();
  const progress = emptyProgress();
  const rawRecords = parsed.records;
  if (isRecordObject(rawRecords)) {
    for (const [moduleId, record] of Object.entries(rawRecords)) {
      // SAFE_ID écarte aussi « __proto__ » et consorts : pas de pollution de prototype possible.
      if (SAFE_ID.test(moduleId) && isModuleRecord(record)) progress.records[moduleId] = { ...record };
    }
  }
  const rawExams = parsed.exams;
  if (isRecordObject(rawExams)) {
    for (const [examId, record] of Object.entries(rawExams)) {
      if (SAFE_ID.test(examId) && isExamRecord(record)) {
        progress.exams[examId] = { bestGrade: record.bestGrade, attempts: record.attempts, lastTakenAt: record.lastTakenAt };
      }
    }
  }
  progress.checkpoint = parseCheckpoint(parsed.checkpoint);
  progress.savedAt = typeof parsed.savedAt === "string" && parsed.savedAt.length <= MAX_ID_LENGTH ? parsed.savedAt : null;
  return progress;
}

export function parseProgress(serialized: string | null): PlayerProgress {
  if (!serialized) return emptyProgress();
  try {
    return progressFromUnknown(JSON.parse(serialized));
  } catch (error) {
    console.warn("Sauvegarde illisible, progression réinitialisée.", error);
    return emptyProgress();
  }
}

export class ProgressStore {
  private progress: PlayerProgress;
  /** Appelé après chaque écriture réussie : sert à afficher l'indicateur « Sauvegardé ». */
  onSaved: ((savedAt: string) => void) | null = null;

  constructor(private readonly storage: KeyValueStorage | null) {
    this.progress = parseProgress(this.safeRead());
  }

  get snapshot(): Readonly<PlayerProgress> {
    return this.progress;
  }

  get checkpoint(): MissionCheckpoint | null {
    return this.progress.checkpoint;
  }

  /** Faux si le navigateur bloque le stockage (navigation privée…) : l'interface doit le dire. */
  get isPersistent(): boolean {
    return this.storage !== null;
  }

  recordFor(moduleId: string): ModuleRecord | undefined {
    return this.progress.records[moduleId];
  }

  /** Ne conserve que le meilleur score ; le statut « fantôme » est acquis définitivement. Termine la mission en cours. */
  saveResult(moduleId: string, result: Omit<ModuleRecord, "completedAt">): ModuleRecord {
    const previous = this.progress.records[moduleId];
    const isBetter = !previous || result.bestScore > previous.bestScore;
    const merged: ModuleRecord = {
      bestScore: isBetter ? result.bestScore : previous.bestScore,
      stars: isBetter ? result.stars : previous.stars,
      ghost: result.ghost || (previous?.ghost ?? false),
      completedAt: new Date().toISOString(),
    };
    this.progress.records[moduleId] = merged;
    if (this.progress.checkpoint?.moduleId === moduleId) this.progress.checkpoint = null;
    this.persist();
    return merged;
  }

  examRecordFor(examId: string): ExamRecord | undefined {
    return this.progress.exams[examId];
  }

  /** Garde la meilleure note et compte les tentatives ; renvoie aussi si la note bat le record. */
  saveExamResult(examId: string, grade: number): { record: ExamRecord; improved: boolean } {
    if (!SAFE_ID.test(examId)) throw new RangeError(`Identifiant d'examen invalide : ${examId}`);
    const previous = this.progress.exams[examId];
    const improved = !previous || grade > previous.bestGrade;
    const record: ExamRecord = {
      bestGrade: improved ? grade : previous.bestGrade,
      attempts: Math.min((previous?.attempts ?? 0) + 1, MAX_COUNTER),
      lastTakenAt: new Date().toISOString(),
    };
    this.progress.exams[examId] = record;
    this.persist();
    return { record, improved };
  }

  saveCheckpoint(checkpoint: Omit<MissionCheckpoint, "savedAt" | "layoutVersion">): void {
    this.progress.checkpoint = { ...checkpoint, layoutVersion: LEVEL_LAYOUT_VERSION, savedAt: new Date().toISOString() };
    this.persist();
  }

  clearCheckpoint(): void {
    if (!this.progress.checkpoint) return;
    this.progress.checkpoint = null;
    this.persist();
  }

  /** Remplace toute la progression (import d'un code de sauvegarde). */
  replaceWith(progress: PlayerProgress): void {
    this.progress = progressFromUnknown(progress);
    this.persist();
  }

  reset(): void {
    this.progress = emptyProgress();
    this.persist();
  }

  private safeRead(): string | null {
    if (!this.storage) return null;
    try {
      return this.storage.getItem(STORAGE_KEY);
    } catch (error) {
      // Navigation privée / stockage bloqué : le jeu reste jouable, sans sauvegarde.
      console.warn("Lecture de la sauvegarde impossible.", error);
      return null;
    }
  }

  private persist(): void {
    this.progress.savedAt = new Date().toISOString();
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
      this.onSaved?.(this.progress.savedAt);
    } catch (error) {
      console.warn("Écriture de la sauvegarde impossible.", error);
    }
  }
}

/**
 * Un module est débloqué si c'est le premier, s'il a déjà été terminé
 * (une sauvegarde antérieure à l'ajout d'un module ne doit rien reverrouiller),
 * ou si le précédent est terminé.
 */
export function isModuleUnlocked(moduleIds: readonly string[], moduleId: string, progress: PlayerProgress): boolean {
  const index = moduleIds.indexOf(moduleId);
  if (index <= 0) return index === 0;
  if (moduleId in progress.records) return true;
  const previousId = moduleIds[index - 1] as string;
  return previousId in progress.records;
}
