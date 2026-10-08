export type GraphicsQuality = "low" | "medium" | "high";

export interface QualityProfile {
  label: string;
  /** Plafond du ratio de pixels : le coût de rendu croît avec son carré. */
  pixelRatioCap: number;
  bloom: boolean;
  vignette: boolean;
  shadows: boolean;
  /** Nombre de particules de poussière dans le niveau. */
  dustParticles: number;
  /** Chaque PointLight alourdit tous les shaders : on plafonne selon l'appareil. */
  roomLights: number;
}

export const QUALITY_PROFILES: Record<GraphicsQuality, QualityProfile> = {
  high: { label: "Haute", pixelRatioCap: 2, bloom: true, vignette: true, shadows: true, dustParticles: 500, roomLights: 6 },
  medium: { label: "Moyenne", pixelRatioCap: 1.25, bloom: true, vignette: true, shadows: false, dustParticles: 220, roomLights: 4 },
  low: { label: "Basse", pixelRatioCap: 1, bloom: false, vignette: false, shadows: false, dustParticles: 0, roomLights: 3 },
};

const QUALITY_ORDER: readonly GraphicsQuality[] = ["high", "medium", "low"];

export function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === "low" || value === "medium" || value === "high";
}

/** Téléphones et tablettes démarrent en qualité moyenne : fluidité d'abord. */
export function defaultQuality(isTouchDevice: boolean): GraphicsQuality {
  return isTouchDevice ? "medium" : "high";
}

export function lowerQuality(quality: GraphicsQuality): GraphicsQuality | null {
  const index = QUALITY_ORDER.indexOf(quality);
  return QUALITY_ORDER[index + 1] ?? null;
}

/** Cycle du bouton de réglage : Haute → Moyenne → Basse → Haute. */
export function nextQuality(quality: GraphicsQuality): GraphicsQuality {
  return lowerQuality(quality) ?? "high";
}

const WARMUP_SECONDS = 3;
const WINDOW_SECONDS = 4;
/** En dessous de ~40 images/s en moyenne, le jeu devient désagréable. */
const MIN_AVERAGE_FPS = 40;

/**
 * Surveille la fluidité réelle : si l'appareil n'arrive pas à suivre, on propose de baisser la qualité.
 * Ignore le démarrage (compilation des shaders, chargement) qui fausse toujours la mesure.
 */
export class FrameRateMonitor {
  private elapsed = 0;
  private windowTime = 0;
  private windowFrames = 0;

  /** Renvoie true quand la moyenne sur la fenêtre est trop basse (une fois par fenêtre). */
  sample(deltaSeconds: number): boolean {
    this.elapsed += deltaSeconds;
    if (this.elapsed < WARMUP_SECONDS) return false;
    this.windowTime += deltaSeconds;
    this.windowFrames++;
    if (this.windowTime < WINDOW_SECONDS) return false;
    const averageFps = this.windowFrames / this.windowTime;
    this.windowTime = 0;
    this.windowFrames = 0;
    return averageFps < MIN_AVERAGE_FPS;
  }

  reset(): void {
    this.elapsed = 0;
    this.windowTime = 0;
    this.windowFrames = 0;
  }
}

const SETTINGS_KEY = "shadow-ops-devops/settings";

/** Réglages propres à l'appareil : volontairement hors du code de sauvegarde (un PC n'est pas un téléphone). */
export class SettingsStore {
  private currentQuality: GraphicsQuality;

  constructor(
    private readonly storage: Pick<Storage, "getItem" | "setItem"> | null,
    isTouchDevice: boolean,
  ) {
    this.currentQuality = this.read() ?? defaultQuality(isTouchDevice);
  }

  get quality(): GraphicsQuality {
    return this.currentQuality;
  }

  setQuality(quality: GraphicsQuality): void {
    this.currentQuality = quality;
    if (!this.storage) return;
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify({ quality }));
    } catch (error) {
      console.warn("Réglages non enregistrés (stockage indisponible).", error);
    }
  }

  private read(): GraphicsQuality | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(SETTINGS_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      const quality = typeof parsed === "object" && parsed !== null ? (parsed as { quality?: unknown }).quality : null;
      return isGraphicsQuality(quality) ? quality : null;
    } catch (error) {
      console.warn("Réglages illisibles, valeurs par défaut utilisées.", error);
      return null;
    }
  }
}
