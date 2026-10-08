import * as THREE from "three";
import { createSentinelIdentity, type SentinelIdentity } from "../combat/weapons";
import { hasLineOfSight, type Cell } from "../core/grid";
import type { InputController } from "../core/input";
import { seedFromString } from "../core/rng";
import type { DevOpsModule } from "../content/types";
import { Guard } from "../entities/guard";
import { IntelPickup } from "../entities/intel";
import { Player, type Posture } from "../entities/player";
import { ExtractionZone, HackTerminal } from "../entities/terminal";
import { generateLevel, type LevelLayout } from "../level/generator";
import { buildLevelScene, cellToWorld, disposeScene } from "../level/levelScene";
import type { MissionDifficulty } from "./difficulty";

export type ContextActionKind = "takedown" | "hack";

export interface HudState {
  livesLeft: number;
  hackedCount: number;
  terminalCount: number;
  intelCollected: number;
  intelTotal: number;
  exposure: number;
  posture: Posture;
  nightVision: boolean;
  /** Action de la touche E à cet instant (neutraliser ou pirater), ou null. */
  contextAction: { kind: ContextActionKind; label: string } | null;
  gadgetAvailable: boolean;
  charges: number;
  /** Nom de la sentinelle visée par le gadget (touche F), ou null si aucune cible. */
  commandTargetLabel: string | null;
}

export interface MinimapSnapshot {
  layout: LevelLayout;
  player: THREE.Vector3;
  guards: { position: THREE.Vector3; heading: number; neutralized: boolean }[];
  terminals: { cell: Cell; hacked: boolean }[];
  intel: { cell: Cell; collected: boolean }[];
  exitUnlocked: boolean;
}

export interface MissionCallbacks {
  onTerminalRequested(terminalIndex: number): void;
  onIntelFound(): void;
  onCommandRequested(guardIndex: number): void;
  onTakedown(): void;
  onDetected(livesLeft: number): void;
  onMissionFailed(): void;
  onExtraction(): void;
  onPauseRequested(): void;
  onNotice(message: string): void;
}

export interface MissionOptions {
  /** Faux pour le module d'introduction : aucun gadget n'a encore été appris. */
  gadgetAvailable: boolean;
}

const INTERACTION_RADIUS = 0.95;
const INTEL_PICKUP_RADIUS = 0.7;
const EXTRACTION_RADIUS = 0.8;
const RESPAWN_GRACE_SECONDS = 2.5;
const NOISE_ALERT_RADIUS = 11;
const COMMAND_RANGE = 8;
const STARTING_CHARGES = 2;
const MAX_CHARGES = 5;
const CAMERA_OFFSET = new THREE.Vector3(0, 12.5, 7.5);
const NOTICE_COOLDOWN_SECONDS = 3;
const FOG_NEAR = 14;
const FOG_FAR = 34;
const MAX_CAMERA_ZOOM = 1.8;

/**
 * Recul de caméra selon le format d'écran : en portrait (téléphone), le champ horizontal
 * devient très étroit, on recule donc pour garder les gardes visibles avant qu'ils ne repèrent le joueur.
 */
export function cameraZoomForAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return THREE.MathUtils.clamp(0.85 / aspect, 1, MAX_CAMERA_ZOOM);
}

/** Une mission = un module de la roadmap joué dans un niveau généré. */
export class Mission {
  readonly scene = new THREE.Scene();
  readonly terminals: HackTerminal[];
  livesLeft: number;
  detections = 0;
  neutralizations = 0;
  elapsedSeconds = 0;
  charges = STARTING_CHARGES;

  private readonly layout: LevelLayout;
  private readonly player: Player;
  private readonly guards: Guard[];
  private readonly identities: SentinelIdentity[];
  private readonly intel: IntelPickup[];
  private readonly extraction: ExtractionZone;
  private readonly targetMarker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly cameraTarget = new THREE.Vector3();
  private readonly cameraOffset = CAMERA_OFFSET.clone();
  private paused = true;
  private finished = false;
  private nightVision = false;
  private graceSeconds = RESPAWN_GRACE_SECONDS;
  private noticeCooldown = 0;

  constructor(
    readonly module: DevOpsModule,
    difficulty: MissionDifficulty,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: InputController,
    private readonly callbacks: MissionCallbacks,
    private readonly options: MissionOptions,
  ) {
    this.livesLeft = difficulty.lives;
    const seed = seedFromString(module.id);
    this.layout = generateLevel({
      seed,
      terminalCount: module.challenges.length,
      guardCount: difficulty.guardCount,
      intelCount: module.lessons.length,
      width: difficulty.mapWidth,
      height: difficulty.mapHeight,
    });
    buildLevelScene(this.scene, this.layout);

    this.player = new Player(this.layout.grid);
    this.player.placeAt(cellToWorld(this.layout.start));
    this.scene.add(this.player.root);

    this.terminals = this.layout.terminals.map(
      (slot, index) => new HackTerminal(slot, `NODE-${String(index + 1).padStart(2, "0")}`),
    );
    for (const terminal of this.terminals) this.scene.add(terminal.root);

    this.intel = this.layout.intel.map((cell) => new IntelPickup(cell));
    for (const pickup of this.intel) this.scene.add(pickup.root);

    this.guards = this.layout.guards.map((route) => new Guard(this.layout.grid, route, difficulty.guardTuning));
    this.identities = this.guards.map((_, index) => createSentinelIdentity(seed, index + 1));
    for (const guard of this.guards) this.scene.add(guard.root, guard.visionCone);

    this.targetMarker = createTargetMarker();
    this.scene.add(this.targetMarker);

    this.extraction = new ExtractionZone(cellToWorld(this.layout.exit));
    this.scene.add(this.extraction.root);
    this.snapCamera();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get hackedCount(): number {
    return this.terminals.filter((terminal) => terminal.hacked).length;
  }

  get intelCollected(): number {
    return this.intel.filter((pickup) => pickup.collected).length;
  }

  get intelTotal(): number {
    return this.intel.length;
  }

  get isNightVisionOn(): boolean {
    return this.nightVision;
  }

  sentinelIdentity(guardIndex: number): SentinelIdentity {
    const identity = this.identities[guardIndex];
    if (!identity) throw new RangeError(`Sentinelle ${guardIndex} inexistante`);
    return identity;
  }

  pause(): void {
    this.paused = true;
  }

  setCameraZoom(zoom: number): void {
    this.cameraOffset.copy(CAMERA_OFFSET).multiplyScalar(zoom);
    // Le brouillard est mesuré depuis la caméra : il recule avec elle, sinon tout serait noyé.
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = FOG_NEAR * zoom;
      this.scene.fog.far = FOG_FAR * zoom;
    }
    this.snapCamera();
  }

  resume(): void {
    if (this.finished) return;
    this.paused = false;
    // Les touches pressées pendant un menu ne doivent pas déclencher d'action en jeu.
    this.input.clear();
  }

  markTerminalHacked(terminalIndex: number): void {
    const terminal = this.terminals[terminalIndex];
    if (!terminal) throw new RangeError(`Terminal ${terminalIndex} inexistant`);
    terminal.markHacked();
    // Chaque terminal piraté recharge le gadget : apprendre donne des moyens d'agir.
    if (this.options.gadgetAvailable) this.charges = Math.min(MAX_CHARGES, this.charges + 1);
    if (this.terminals.every((candidate) => candidate.hacked)) {
      this.extraction.unlock();
      this.callbacks.onNotice("Tous les terminaux sont piratés : rejoins le point d'extraction (faisceau vert).");
    }
  }

  /** Mauvaise réponse = bruit : les gardes proches viennent inspecter le terminal. */
  raiseNoiseAt(terminalIndex: number): void {
    const terminal = this.terminals[terminalIndex];
    if (!terminal) throw new RangeError(`Terminal ${terminalIndex} inexistant`);
    const noiseCell = terminal.slot.accessCell;
    const noisePosition = cellToWorld(noiseCell);
    for (const guard of this.guards) {
      if (guard.position.distanceTo(noisePosition) <= NOISE_ALERT_RADIUS) guard.investigate(noiseCell);
    }
  }

  /** Commande juste : la sentinelle est arrêtée et une charge est consommée. */
  neutralizeByCommand(guardIndex: number): void {
    const guard = this.requireGuard(guardIndex);
    if (guard.neutralized) return;
    guard.neutralize();
    this.neutralizations++;
    this.charges = Math.max(0, this.charges - 1);
  }

  /** Commande ratée : la cible entend quelque chose et vient voir d'où vient le bruit. */
  commandFailedOn(guardIndex: number): void {
    const guard = this.requireGuard(guardIndex);
    guard.alertTo({ x: Math.floor(this.player.position.x), z: Math.floor(this.player.position.z) });
  }

  hudState(): HudState {
    const commandTarget = this.commandTargetIndex();
    return {
      livesLeft: this.livesLeft,
      hackedCount: this.hackedCount,
      terminalCount: this.terminals.length,
      intelCollected: this.intelCollected,
      intelTotal: this.intelTotal,
      exposure: this.guards.reduce((highest, guard) => Math.max(highest, guard.awareness), 0),
      posture: this.player.posture,
      nightVision: this.nightVision,
      contextAction: this.contextAction(),
      gadgetAvailable: this.options.gadgetAvailable,
      charges: this.charges,
      commandTargetLabel: commandTarget === null ? null : this.sentinelIdentity(commandTarget).containerName,
    };
  }

  minimapSnapshot(): MinimapSnapshot {
    return {
      layout: this.layout,
      player: this.player.position,
      guards: this.guards.map((guard) => ({ position: guard.position, heading: guard.heading, neutralized: guard.neutralized })),
      terminals: this.terminals.map((terminal) => ({ cell: terminal.slot.cell, hacked: terminal.hacked })),
      intel: this.intel.map((pickup) => ({ cell: pickup.cell, collected: pickup.collected })),
      exitUnlocked: this.extraction.unlocked,
    };
  }

  tick(deltaSeconds: number, elapsedSeconds: number): void {
    for (const terminal of this.terminals) terminal.update(elapsedSeconds);
    for (const pickup of this.intel) pickup.update(elapsedSeconds);
    this.extraction.update(elapsedSeconds);
    if (this.paused || this.finished) return;

    this.elapsedSeconds += deltaSeconds;
    this.noticeCooldown = Math.max(0, this.noticeCooldown - deltaSeconds);
    if (this.handleActions()) return;

    this.player.update(deltaSeconds, this.input.moveIntent());
    if (this.collectNearbyIntel()) return;
    this.updateGuards(deltaSeconds);
    if (this.finished || this.paused) return;
    this.updateTargetMarker(elapsedSeconds);
    this.checkExtraction();
    this.followCamera(deltaSeconds);
  }

  dispose(): void {
    disposeScene(this.scene);
  }

  /** Renvoie true si une action a interrompu la frame (menu ouvert). */
  private handleActions(): boolean {
    if (this.input.consume("pause")) {
      this.pause();
      this.callbacks.onPauseRequested();
      return true;
    }
    if (this.input.consume("crouch")) this.player.crouched = !this.player.crouched;
    if (this.input.consume("nightVision")) this.nightVision = !this.nightVision;
    if (this.input.consume("interact") && this.performContextAction()) return true;
    if (this.input.consume("command")) return this.requestCommand();
    return false;
  }

  /** Neutraliser passe avant pirater : une sentinelle dans le dos est une urgence. */
  private contextAction(): HudState["contextAction"] {
    if (this.takedownCandidate()) return { kind: "takedown", label: "Neutraliser la sentinelle" };
    const terminal = this.nearbyTerminal();
    return terminal ? { kind: "hack", label: `Pirater ${terminal.label}` } : null;
  }

  private performContextAction(): boolean {
    const guard = this.takedownCandidate();
    if (guard) {
      guard.neutralize();
      this.neutralizations++;
      this.callbacks.onTakedown();
      return false;
    }
    const terminal = this.nearbyTerminal();
    if (!terminal) return false;
    this.pause();
    this.callbacks.onTerminalRequested(this.terminals.indexOf(terminal));
    return true;
  }

  private requestCommand(): boolean {
    if (!this.options.gadgetAvailable) {
      this.notice("Aucun gadget pour l'instant : approche les sentinelles par derrière (E) pour les neutraliser.");
      return false;
    }
    if (this.charges === 0) {
      this.notice("Gadget déchargé : pirate un terminal pour gagner une charge.");
      return false;
    }
    const targetIndex = this.commandTargetIndex();
    if (targetIndex === null) {
      this.notice("Aucune sentinelle en vue à portée du gadget.");
      return false;
    }
    this.pause();
    this.callbacks.onCommandRequested(targetIndex);
    return true;
  }

  private takedownCandidate(): Guard | null {
    return this.guards.find((guard) => guard.canBeTakenDownFrom(this.player.position)) ?? null;
  }

  /** Cible du gadget : la sentinelle active la plus proche, à portée et en ligne de vue. */
  private commandTargetIndex(): number | null {
    if (!this.options.gadgetAvailable || this.charges === 0) return null;
    let bestIndex: number | null = null;
    let bestDistance = COMMAND_RANGE;
    for (const [index, guard] of this.guards.entries()) {
      if (guard.neutralized) continue;
      const distance = guard.position.distanceTo(this.player.position);
      if (distance > bestDistance) continue;
      if (!hasLineOfSight(this.layout.grid, this.player.position.x, this.player.position.z, guard.position.x, guard.position.z)) continue;
      bestDistance = distance;
      bestIndex = index;
    }
    return bestIndex;
  }

  private collectNearbyIntel(): boolean {
    const pickup = this.intel.find(
      (candidate) =>
        !candidate.collected &&
        Math.hypot(this.player.position.x - candidate.position.x, this.player.position.z - candidate.position.z) <= INTEL_PICKUP_RADIUS,
    );
    if (!pickup) return false;
    pickup.collect();
    this.pause();
    this.callbacks.onIntelFound();
    return true;
  }

  private updateGuards(deltaSeconds: number): void {
    this.graceSeconds = Math.max(0, this.graceSeconds - deltaSeconds);
    const playerSnapshot =
      this.graceSeconds > 0
        ? null
        : { position: this.player.position, posture: this.player.posture, isMoving: this.player.isMoving };
    for (const guard of this.guards) guard.update(deltaSeconds, playerSnapshot);
    if (this.guards.some((guard) => guard.awareness >= 1)) this.handleDetection();
  }

  private handleDetection(): void {
    this.detections++;
    this.livesLeft--;
    if (this.livesLeft <= 0) {
      this.finished = true;
      this.callbacks.onMissionFailed();
      return;
    }
    // Les terminaux piratés et les sentinelles neutralisées restent acquis : on pénalise sans tout faire rejouer.
    this.player.placeAt(cellToWorld(this.layout.start));
    this.player.crouched = false;
    for (const guard of this.guards) guard.reset();
    this.graceSeconds = RESPAWN_GRACE_SECONDS;
    this.snapCamera();
    this.pause();
    this.callbacks.onDetected(this.livesLeft);
  }

  private checkExtraction(): void {
    const distance = Math.hypot(
      this.player.position.x - this.extraction.position.x,
      this.player.position.z - this.extraction.position.z,
    );
    if (distance > EXTRACTION_RADIUS) return;
    if (this.extraction.unlocked) {
      this.finished = true;
      this.paused = true;
      this.callbacks.onExtraction();
      return;
    }
    const remaining = this.terminals.length - this.hackedCount;
    this.notice(`Extraction verrouillée : encore ${remaining} terminal(aux) à pirater.`);
  }

  private notice(message: string): void {
    if (this.noticeCooldown > 0) return;
    this.callbacks.onNotice(message);
    this.noticeCooldown = NOTICE_COOLDOWN_SECONDS;
  }

  private nearbyTerminal(): HackTerminal | null {
    for (const terminal of this.terminals) {
      if (terminal.hacked) continue;
      const distance = Math.hypot(
        this.player.position.x - terminal.interactionPoint.x,
        this.player.position.z - terminal.interactionPoint.z,
      );
      if (distance <= INTERACTION_RADIUS) return terminal;
    }
    return null;
  }

  private updateTargetMarker(elapsedSeconds: number): void {
    const targetIndex = this.commandTargetIndex();
    const target = targetIndex === null ? null : this.guards[targetIndex];
    this.targetMarker.visible = target !== null && target !== undefined;
    if (!target) return;
    this.targetMarker.position.set(target.position.x, 0.05, target.position.z);
    this.targetMarker.rotation.z = elapsedSeconds * 1.5;
  }

  private requireGuard(guardIndex: number): Guard {
    const guard = this.guards[guardIndex];
    if (!guard) throw new RangeError(`Sentinelle ${guardIndex} inexistante`);
    return guard;
  }

  private followCamera(deltaSeconds: number): void {
    this.cameraTarget.copy(this.player.position).add(this.cameraOffset);
    // Lissage indépendant du framerate (exponentiel) : même ressenti à 30 ou 144 FPS.
    this.camera.position.lerp(this.cameraTarget, 1 - Math.exp(-deltaSeconds * 6));
    this.camera.lookAt(this.player.position.x, 0.5, this.player.position.z);
  }

  private snapCamera(): void {
    this.camera.position.copy(this.player.position).add(this.cameraOffset);
    this.camera.lookAt(this.player.position.x, 0.5, this.player.position.z);
  }
}

/** Réticule au sol sous la sentinelle visée par le gadget. */
function createTargetMarker(): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.62, 4, 1),
    new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  return marker;
}
