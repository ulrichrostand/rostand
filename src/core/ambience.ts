import type { AudioEngine } from "./sound";

/** Niveaux cibles de l'ambiance, calculés à part du graphe audio pour être testables. */
export interface AmbienceLevels {
  /** Volume de l'ensemble de l'ambiance (baissé quand le jeu est en pause ou dans un terminal). */
  bus: number;
  /** Volume du bourdon de tension. */
  tension: number;
  /** Amplitude de la pulsation du bourdon (comme un cœur qui s'accélère). */
  pulseDepth: number;
  pulseRate: number;
  /** Fréquence de coupure du bourdon : il « s'ouvre » et devient plus agressif quand on est repéré. */
  tensionCutoff: number;
}

const BUS_VOLUME = 1;
const PAUSED_BUS_VOLUME = 0.35;
const MAX_TENSION_VOLUME = 0.09;
/** Constante de temps des transitions : la musique suit l'action sans à-coups. */
const SMOOTHING_SECONDS = 0.35;
const FADE_IN_SECONDS = 1.5;
const FADE_OUT_SECONDS = 0.6;
const BLIP_MIN_DELAY_SECONDS = 2.5;
const BLIP_MAX_DELAY_SECONDS = 7;
const BLIP_NOTES = [880, 1175, 1319, 1568, 1760, 2093];

export function ambienceLevels(tension: number, paused: boolean): AmbienceLevels {
  const clamped = Math.min(Math.max(tension, 0), 1);
  // Courbe en puissance : une exposition faible reste discrète, la musique monte vraiment près de la détection.
  const intensity = clamped ** 1.5;
  return {
    bus: paused ? PAUSED_BUS_VOLUME : BUS_VOLUME,
    tension: 0.0001 + intensity * MAX_TENSION_VOLUME,
    pulseDepth: intensity * MAX_TENSION_VOLUME * 0.6,
    pulseRate: 0.9 + clamped * 2.1,
    tensionCutoff: 140 + clamped * 760,
  };
}

export function nextBlipDelay(random: () => number): number {
  return BLIP_MIN_DELAY_SECONDS + random() * (BLIP_MAX_DELAY_SECONDS - BLIP_MIN_DELAY_SECONDS);
}

interface AmbienceGraph {
  context: AudioContext;
  bus: GainNode;
  tensionGain: GainNode;
  tensionFilter: BiquadFilterNode;
  pulse: OscillatorNode;
  pulseGain: GainNode;
  sources: AudioScheduledSourceNode[];
}

/**
 * Ambiance de salle serveur 100 % synthétisée : bourdonnement électrique, souffle des ventilateurs,
 * bips de machines au hasard, et un bourdon de tension qui suit l'exposition de l'agent.
 */
export class Ambience {
  private graph: AmbienceGraph | null = null;
  private blipCountdown = nextBlipDelay(Math.random);

  constructor(private readonly engine: AudioEngine) {}

  get isPlaying(): boolean {
    return this.graph !== null;
  }

  /** Idempotent ; ne fait rien si le son est coupé (on la relance quand il est réactivé). */
  start(): void {
    if (this.graph) return;
    const output = this.engine.output();
    if (!output) return;
    this.graph = buildGraph(output.context, output.destination);
    this.blipCountdown = nextBlipDelay(Math.random);
  }

  stop(): void {
    const graph = this.graph;
    if (!graph) return;
    this.graph = null;
    const stopAt = graph.context.currentTime + FADE_OUT_SECONDS;
    graph.bus.gain.cancelScheduledValues(graph.context.currentTime);
    graph.bus.gain.setTargetAtTime(0, graph.context.currentTime, FADE_OUT_SECONDS / 4);
    for (const source of graph.sources) source.stop(stopAt);
    // Libère le graphe une fois le fondu terminé (les nœuds débranchés sont ramassés par le navigateur).
    graph.sources[0]?.addEventListener("ended", () => graph.bus.disconnect(), { once: true });
  }

  /** À chaque image : `tension` ∈ [0, 1] (exposition), `paused` baisse le volume dans les menus et terminaux. */
  update(deltaSeconds: number, tension: number, paused: boolean): void {
    const graph = this.graph;
    if (!graph) return;
    const levels = ambienceLevels(tension, paused);
    const now = graph.context.currentTime;
    graph.bus.gain.setTargetAtTime(levels.bus, now, SMOOTHING_SECONDS);
    graph.tensionGain.gain.setTargetAtTime(levels.tension, now, SMOOTHING_SECONDS);
    graph.pulseGain.gain.setTargetAtTime(levels.pulseDepth, now, SMOOTHING_SECONDS);
    graph.pulse.frequency.setTargetAtTime(levels.pulseRate, now, SMOOTHING_SECONDS);
    graph.tensionFilter.frequency.setTargetAtTime(levels.tensionCutoff, now, SMOOTHING_SECONDS);
    if (paused) return;
    this.blipCountdown -= deltaSeconds;
    if (this.blipCountdown > 0) return;
    this.blipCountdown = nextBlipDelay(Math.random);
    playBlip(graph);
  }
}

function buildGraph(context: AudioContext, destination: AudioNode): AmbienceGraph {
  const now = context.currentTime;
  const bus = context.createGain();
  bus.gain.setValueAtTime(0, now);
  bus.gain.linearRampToValueAtTime(BUS_VOLUME, now + FADE_IN_SECONDS);
  bus.connect(destination);
  const sources: AudioScheduledSourceNode[] = [];

  // Bourdonnement du secteur électrique (50 Hz et harmonique), filtré pour rester sourd.
  const humFilter = context.createBiquadFilter();
  humFilter.type = "lowpass";
  humFilter.frequency.value = 220;
  const humGain = context.createGain();
  humGain.gain.value = 0.03;
  humFilter.connect(humGain).connect(bus);
  for (const [frequency, wave] of [[50, "sine"], [100.4, "triangle"]] as const) {
    const oscillator = context.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    oscillator.connect(humFilter);
    sources.push(oscillator);
  }

  // Souffle des ventilateurs : bruit brun en boucle, filtré en passe-bande.
  const air = context.createBufferSource();
  air.buffer = createBrownNoise(context, 2);
  air.loop = true;
  const airFilter = context.createBiquadFilter();
  airFilter.type = "bandpass";
  airFilter.frequency.value = 520;
  airFilter.Q.value = 0.6;
  const airGain = context.createGain();
  airGain.gain.value = 0.05;
  air.connect(airFilter).connect(airGain).connect(bus);
  sources.push(air);

  // Bourdon de tension : deux dents de scie légèrement désaccordées (battement inquiétant), pulsées par un LFO.
  const tensionFilter = context.createBiquadFilter();
  tensionFilter.type = "lowpass";
  tensionFilter.frequency.value = 140;
  const tensionGain = context.createGain();
  tensionGain.gain.value = 0.0001;
  tensionFilter.connect(tensionGain).connect(bus);
  for (const frequency of [55, 55.8]) {
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = frequency;
    oscillator.connect(tensionFilter);
    sources.push(oscillator);
  }
  const pulse = context.createOscillator();
  pulse.frequency.value = 0.9;
  const pulseGain = context.createGain();
  pulseGain.gain.value = 0;
  pulse.connect(pulseGain).connect(tensionGain.gain);
  sources.push(pulse);

  for (const source of sources) source.start(now);
  return { context, bus, tensionGain, tensionFilter, pulse, pulseGain, sources };
}

/** Bip discret d'une machine quelque part dans la salle (position stéréo aléatoire). */
function playBlip(graph: AmbienceGraph): void {
  const { context, bus } = graph;
  const startAt = context.currentTime + 0.02;
  const repeats = Math.random() < 0.3 ? 2 : 1;
  const frequency = BLIP_NOTES[Math.floor(Math.random() * BLIP_NOTES.length)] ?? 1319;
  // StereoPannerNode manque sur de vieux Safari : on joue alors le bip au centre.
  const panner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = Math.random() * 1.6 - 0.8;
    panner.connect(bus);
  }
  for (let repeat = 0; repeat < repeats; repeat++) {
    const at = startAt + repeat * 0.12;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.012, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    oscillator.connect(gain).connect(panner ?? bus);
    oscillator.start(at);
    oscillator.stop(at + 0.08);
  }
}

/** Bruit brun (intégration d'un bruit blanc) : plus grave et doux que le bruit blanc, comme un souffle d'air. */
function createBrownNoise(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < samples.length; index++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    samples[index] = last * 3.5;
  }
  // Recale la dérive pour que la fin rejoigne le début : sans ça, la boucle « claque » toutes les 2 s.
  const drift = (samples[samples.length - 1] ?? 0) - (samples[0] ?? 0);
  for (let index = 0; index < samples.length; index++) samples[index] = (samples[index] ?? 0) - (drift * index) / samples.length;
  return buffer;
}
