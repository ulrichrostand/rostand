import * as THREE from "three";
import type { Cell } from "../core/grid";
import type { InputController } from "../core/input";
import { seedFromString } from "../core/rng";
import type { DevOpsModule } from "../content/types";
import { Guard } from "../entities/guard";
import { Player, type Posture } from "../entities/player";
import { ExtractionZone, HackTerminal } from "../entities/terminal";
import { generateLevel, type LevelLayout } from "../level/generator";
import { buildLevelScene, cellToWorld, disposeScene } from "../level/levelScene";
import type { MissionDifficulty } from "./difficulty";

export interface HudState {
  livesLeft: number;
  hackedCount: number;
  terminalCount: number;
  exposure: number;
  posture: Posture;
  nightVision: boolean;
  interactionLabel: string | null;
}

export interface MinimapSnapshot {
  layout: LevelLayout;
  player: THREE.Vector3;
  guards: { position: THREE.Vector3; heading: number }[];
  terminals: { cell: Cell; hacked: boolean }[];
  exitUnlocked: boolean;
}

export interface MissionCallbacks {
  onTerminalRequested(terminalIndex: number): void;
  onDetected(livesLeft: number): void;
  onMissionFailed(): void;
  onExtraction(): void;
  onPauseRequested(): void;
  onNotice(message: string): void;
}

const INTERACTION_RADIUS = 0.95;
const EXTRACTION_RADIUS = 0.8;
const RESPAWN_GRACE_SECONDS = 2.5;
const NOISE_ALERT_RADIUS = 11;
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
  elapsedSeconds = 0;

  private readonly layout: LevelLayout;
  private readonly player: Player;
  private readonly guards: Guard[];
  private readonly extraction: ExtractionZone;
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
  ) {
    this.livesLeft = difficulty.lives;
    this.layout = generateLevel({
      seed: seedFromString(module.id),
      terminalCount: module.challenges.length,
      guardCount: difficulty.guardCount,
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

    this.guards = this.layout.guards.map((route) => new Guard(this.layout.grid, route, difficulty.guardTuning));
    for (const guard of this.guards) this.scene.add(guard.root, guard.visionCone);

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

  get isNightVisionOn(): boolean {
    return this.nightVision;
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

  hudState(): HudState {
    const nearbyTerminal = this.nearbyTerminal();
    return {
      livesLeft: this.livesLeft,
      hackedCount: this.hackedCount,
      terminalCount: this.terminals.length,
      exposure: this.guards.reduce((highest, guard) => Math.max(highest, guard.awareness), 0),
      posture: this.player.posture,
      nightVision: this.nightVision,
      interactionLabel: nearbyTerminal ? `Pirater ${nearbyTerminal.label}` : null,
    };
  }

  minimapSnapshot(): MinimapSnapshot {
    return {
      layout: this.layout,
      player: this.player.position,
      guards: this.guards.map((guard) => ({ position: guard.position, heading: guard.heading })),
      terminals: this.terminals.map((terminal) => ({ cell: terminal.slot.cell, hacked: terminal.hacked })),
      exitUnlocked: this.extraction.unlocked,
    };
  }

  tick(deltaSeconds: number, elapsedSeconds: number): void {
    for (const terminal of this.terminals) terminal.update(elapsedSeconds);
    this.extraction.update(elapsedSeconds);
    if (this.paused || this.finished) return;

    this.elapsedSeconds += deltaSeconds;
    this.noticeCooldown = Math.max(0, this.noticeCooldown - deltaSeconds);
    if (this.handleActions()) return;

    this.player.update(deltaSeconds, this.input.moveIntent());
    this.updateGuards(deltaSeconds);
    if (this.finished || this.paused) return;
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
    if (this.input.consume("interact")) {
      const terminal = this.nearbyTerminal();
      if (terminal) {
        this.pause();
        this.callbacks.onTerminalRequested(this.terminals.indexOf(terminal));
        return true;
      }
    }
    return false;
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
    // Les terminaux déjà piratés restent acquis : on pénalise sans faire tout rejouer.
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
    if (this.noticeCooldown === 0) {
      const remaining = this.terminals.length - this.hackedCount;
      this.callbacks.onNotice(`Extraction verrouillée : encore ${remaining} terminal(aux) à pirater.`);
      this.noticeCooldown = NOTICE_COOLDOWN_SECONDS;
    }
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
