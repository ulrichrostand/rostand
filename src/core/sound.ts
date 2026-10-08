type Cue = "success" | "failure" | "alarm" | "hack" | "extract" | "takedown";

const CUE_NOTES: Record<Cue, { frequencies: number[]; duration: number; wave: OscillatorType }> = {
  hack: { frequencies: [660], duration: 0.08, wave: "square" },
  success: { frequencies: [523, 784, 1046], duration: 0.11, wave: "triangle" },
  failure: { frequencies: [220, 165], duration: 0.18, wave: "sawtooth" },
  alarm: { frequencies: [880, 660, 880, 660], duration: 0.14, wave: "square" },
  extract: { frequencies: [392, 523, 659, 784], duration: 0.13, wave: "triangle" },
  takedown: { frequencies: [196, 98], duration: 0.12, wave: "sine" },
};

/**
 * Effets sonores synthétisés (aucun fichier audio à charger).
 * L'AudioContext est créé au premier son : les navigateurs exigent un geste utilisateur.
 */
export class SoundFx {
  private context: AudioContext | null = null;
  private unavailable = false;
  muted = false;

  play(cue: Cue): void {
    if (this.muted) return;
    const context = this.ensureContext();
    if (!context) return;
    const { frequencies, duration, wave } = CUE_NOTES[cue];
    frequencies.forEach((frequency, index) => {
      const startAt = context.currentTime + index * duration;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.06, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    });
  }

  private ensureContext(): AudioContext | null {
    if (this.unavailable) return null;
    if (this.context) return this.context;
    try {
      this.context = new AudioContext();
      return this.context;
    } catch (error) {
      this.unavailable = true;
      console.warn("Audio indisponible, le jeu continue sans son.", error);
      return null;
    }
  }
}
