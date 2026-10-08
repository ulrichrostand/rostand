type Cue = "success" | "failure" | "alarm" | "hack" | "extract" | "takedown" | "shot" | "shotHit";

const CUE_NOTES: Record<Cue, { frequencies: number[]; duration: number; wave: OscillatorType }> = {
  hack: { frequencies: [660], duration: 0.08, wave: "square" },
  success: { frequencies: [523, 784, 1046], duration: 0.11, wave: "triangle" },
  failure: { frequencies: [220, 165], duration: 0.18, wave: "sawtooth" },
  alarm: { frequencies: [880, 660, 880, 660], duration: 0.14, wave: "square" },
  extract: { frequencies: [392, 523, 659, 784], duration: 0.13, wave: "triangle" },
  takedown: { frequencies: [196, 98], duration: 0.12, wave: "sine" },
  shot: { frequencies: [1400, 700], duration: 0.06, wave: "sawtooth" },
  shotHit: { frequencies: [1400, 520, 260], duration: 0.07, wave: "square" },
};

export interface AudioOutput {
  context: AudioContext;
  destination: AudioNode;
}

/**
 * Contexte audio unique (les navigateurs en limitent le nombre) et volume général.
 * Il est créé au premier son : les navigateurs exigent un geste de l'utilisateur.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private unavailable = false;

  constructor(private enabled: boolean) {}

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!this.context || !this.master) return;
    // Rampe courte : couper net un son en cours produit un « clic ».
    this.master.gain.setTargetAtTime(enabled ? 1 : 0, this.context.currentTime, 0.05);
    if (enabled) void this.resume(this.context);
  }

  /** null si le son est coupé ou indisponible : l'appelant ne joue simplement rien. */
  output(): AudioOutput | null {
    if (!this.enabled) return null;
    const context = this.ensureContext();
    if (!context || !this.master) return null;
    if (context.state === "suspended") void this.resume(context);
    return { context, destination: this.master };
  }

  private ensureContext(): AudioContext | null {
    if (this.unavailable) return null;
    if (this.context) return this.context;
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      return this.context;
    } catch (error) {
      this.unavailable = true;
      console.warn("Audio indisponible, le jeu continue sans son.", error);
      return null;
    }
  }

  private async resume(context: AudioContext): Promise<void> {
    try {
      await context.resume();
    } catch (error) {
      console.warn("Reprise de l'audio refusée par le navigateur.", error);
    }
  }
}

/** Effets sonores synthétisés (aucun fichier audio à charger). */
export class SoundFx {
  constructor(private readonly engine: AudioEngine) {}

  play(cue: Cue): void {
    const output = this.engine.output();
    if (!output) return;
    const { context, destination } = output;
    const { frequencies, duration, wave } = CUE_NOTES[cue];
    frequencies.forEach((frequency, index) => {
      const startAt = context.currentTime + index * duration;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.06, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain).connect(destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    });
  }
}
