export interface ModuleRecord {
  bestScore: number;
  stars: 1 | 2 | 3;
  ghost: boolean;
  completedAt: string;
}

export interface PlayerProgress {
  version: 1;
  records: Record<string, ModuleRecord>;
}

const STORAGE_KEY = "shadow-ops-devops/progress";

export function emptyProgress(): PlayerProgress {
  return { version: 1, records: {} };
}

/** Interface minimale de stockage : permet d'injecter un faux stockage dans les tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isModuleRecord(candidate: unknown): candidate is ModuleRecord {
  if (typeof candidate !== "object" || candidate === null) return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.bestScore === "number" &&
    Number.isFinite(record.bestScore) &&
    (record.stars === 1 || record.stars === 2 || record.stars === 3) &&
    typeof record.ghost === "boolean" &&
    typeof record.completedAt === "string"
  );
}

/**
 * Le localStorage est modifiable par l'utilisateur : on valide la forme
 * au lieu de faire confiance à JSON.parse, et on ignore les entrées corrompues.
 */
export function parseProgress(serialized: string | null): PlayerProgress {
  if (!serialized) return emptyProgress();
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    console.warn("Sauvegarde illisible, progression réinitialisée.", error);
    return emptyProgress();
  }
  if (typeof parsed !== "object" || parsed === null) return emptyProgress();
  const rawRecords = (parsed as { records?: unknown }).records;
  if (typeof rawRecords !== "object" || rawRecords === null) return emptyProgress();

  const records: Record<string, ModuleRecord> = Object.create(null);
  for (const [moduleId, record] of Object.entries(rawRecords)) {
    if (isModuleRecord(record)) records[moduleId] = record;
  }
  return { version: 1, records };
}

export class ProgressStore {
  private progress: PlayerProgress;

  constructor(private readonly storage: KeyValueStorage | null) {
    this.progress = parseProgress(this.safeRead());
  }

  get snapshot(): Readonly<PlayerProgress> {
    return this.progress;
  }

  recordFor(moduleId: string): ModuleRecord | undefined {
    return this.progress.records[moduleId];
  }

  /** Ne conserve que le meilleur score ; le statut « fantôme » est acquis définitivement. */
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
    this.persist();
    return merged;
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
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
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
