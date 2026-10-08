import * as THREE from "three";
import { createCameraIdentity, createSentinelIdentity, type SentinelIdentity, type TargetKind } from "../combat/weapons";
import { castRay, hasLineOfSight, type Cell } from "../core/grid";
import type { InputController } from "../core/input";
import type { QualityProfile } from "../core/settings";
import { seedFromString } from "../core/rng";
import type { DevOpsModule } from "../content/types";
import { Guard } from "../entities/guard";
import { IntelPickup } from "../entities/intel";
import { SecurityCamera } from "../entities/securityCamera";
import { Player, type Posture } from "../entities/player";
import { ExtractionZone, HackTerminal } from "../entities/terminal";
import { generateLevel, type LevelLayout } from "../level/generator";
import { accentForModule, buildLevelScene, cellToWorld, disposeScene, type LevelVisuals } from "../level/levelScene";
import type { MissionDifficulty } from "./difficulty";

export type ContextActionKind = "takedown" | "hack";

/** Une cible du gadget ou du pistolet : une sentinelle ou une caméra, par son index. */
export interface TargetRef {
  kind: TargetKind;
  index: number;
}

export type ShotResult = "sentinel" | "camera" | "miss";

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
  /** Nom de la cible du gadget (touche F), ou null si aucune cible. */
  commandTargetLabel: string | null;
  ammo: number;
  /** Nom de la cible du pistolet IEM, ou null (le tir partira droit devant). */
  shotTargetLabel: string | null;
}

export interface MinimapSnapshot {
  layout: LevelLayout;
  player: THREE.Vector3;
  guards: { position: THREE.Vector3; heading: number; neutralized: boolean }[];
  cameras: { cell: Cell; active: boolean }[];
  terminals: { cell: Cell; hacked: boolean }[];
  intel: { cell: Cell; collected: boolean }[];
  exitUnlocked: boolean;
}

export interface MissionCallbacks {
  onTerminalRequested(terminalIndex: number): void;
  onIntelFound(): void;
  onCommandRequested(target: TargetRef): void;
  onTakedown(): void;
  onShot(result: ShotResult): void;
  onDetected(livesLeft: number): void;
  onMissionFailed(): void;
  onExtraction(): void;
  onPauseRequested(): void;
  onNotice(message: string): void;
}

/** Ce qui permet de reprendre une mission là où on l'a laissée (sans les données propres à l'interface). */
export interface MissionProgressState {
  hackedTerminals: number[];
  collectedIntel: number[];
  neutralizedGuards: number[];
  firewalledCameras: number[];
  charges: number;
  ammo: number;
  livesLeft: number;
  detections: number;
  neutralizations: number;
  elapsedSeconds: number;
  playerCell: Cell;
}

export interface MissionOptions {
  /** Gadgets appris pour chaque type de cible (aucun pendant l'introduction). */
  gadgetTargets: Record<TargetKind, boolean>;
  /** Position du module dans la campagne : donne la couleur d'ambiance du secteur. */
  moduleIndex: number;
  quality: QualityProfile;
}

const INTERACTION_RADIUS = 0.95;
const INTEL_PICKUP_RADIUS = 0.7;
const EXTRACTION_RADIUS = 0.8;
const RESPAWN_GRACE_SECONDS = 2.5;
const NOISE_ALERT_RADIUS = 11;
const COMMAND_RANGE = 8;
const STARTING_CHARGES = 2;
const MAX_CHARGES = 5;
const STARTING_AMMO = 3;
const MAX_AMMO = 6;
const SHOT_RANGE = 10;
/** Tolérance angulaire de la visée à la souris (~14°) : on vise une silhouette, pas un pixel. */
const AIM_TOLERANCE_RADIANS = 0.25;
const SHOT_NOISE_RADIUS = 7;
const CAMERA_EMP_SECONDS = 12;
const CAMERA_CALL_RADIUS = 12;
const CAMERA_CALL_COOLDOWN_SECONDS = 4;
const TRACER_LIFETIME_SECONDS = 0.2;
const CAMERA_OFFSET = new THREE.Vector3(0, 12.5, 7.5);
const NOTICE_COOLDOWN_SECONDS = 3;
const FOG_NEAR = 14;
const FOG_FAR = 34;
const MAX_CAMERA_ZOOM = 1.8;
/** Lumière d'ombres : orientée en biais pour des ombres longues, façon infiltration. */
const SHADOW_LIGHT_OFFSET = new THREE.Vector3(5, 11, 3);
const SHADOW_AREA_HALF_SIZE = 11;

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
  ammo = STARTING_AMMO;

  private readonly layout: LevelLayout;
  private readonly player: Player;
  private readonly guards: Guard[];
  private readonly identities: SentinelIdentity[];
  private readonly cameras: SecurityCamera[];
  private readonly cameraIdentities: SentinelIdentity[];
  private readonly aimMarker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly tracers: { mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>; life: number }[] = [];
  /** Point visé à la souris sur le sol, ou null (tactile / pas de souris) : auto-visée. */
  private aimPoint: THREE.Vector3 | null = null;
  private cameraCallCooldown = 0;
  private readonly intel: IntelPickup[];
  private readonly extraction: ExtractionZone;
  private readonly targetMarker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly visuals: LevelVisuals;
  private readonly shadowLight: THREE.DirectionalLight | null;
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
      // + 1 : la console principale (scénario d'intervention) en plus des terminaux à question.
      terminalCount: module.challenges.length + 1,
      guardCount: difficulty.guardCount,
      intelCount: module.lessons.length,
      cameraCount: difficulty.cameraCount,
      width: difficulty.mapWidth,
      height: difficulty.mapHeight,
    });
    this.visuals = buildLevelScene(this.scene, this.layout, {
      accent: accentForModule(options.moduleIndex),
      profile: options.quality,
      seed,
    });
    this.shadowLight = options.quality.shadows ? createShadowLight() : null;
    if (this.shadowLight) this.scene.add(this.shadowLight, this.shadowLight.target);

    this.player = new Player(this.layout.grid);
    this.player.placeAt(cellToWorld(this.layout.start));
    this.scene.add(this.player.root);

    this.terminals = this.layout.terminals.map((slot, index) =>
      index < module.challenges.length
        ? new HackTerminal(slot, `NODE-${String(index + 1).padStart(2, "0")}`)
        : new HackTerminal(slot, "CONSOLE", "console"),
    );
    for (const terminal of this.terminals) this.scene.add(terminal.root);

    this.intel = this.layout.intel.map((cell) => new IntelPickup(cell));
    for (const pickup of this.intel) this.scene.add(pickup.root);

    this.guards = this.layout.guards.map((route) => new Guard(this.layout.grid, route, difficulty.guardTuning));
    this.identities = this.guards.map((_, index) => createSentinelIdentity(seed, index + 1));
    for (const guard of this.guards) this.scene.add(guard.root, guard.visionCone);

    this.cameras = this.layout.cameras.map((slot) => new SecurityCamera(this.layout.grid, slot));
    this.cameraIdentities = this.cameras.map((_, index) => createCameraIdentity(seed, index + 1));
    for (const camera of this.cameras) this.scene.add(camera.root);

    this.targetMarker = createTargetMarker(0x4fc3ff);
    this.aimMarker = createTargetMarker(0xff3b4e);
    this.scene.add(this.targetMarker, this.aimMarker);

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

  targetIdentity(target: TargetRef): SentinelIdentity {
    const identity = target.kind === "sentinel" ? this.identities[target.index] : this.cameraIdentities[target.index];
    if (!identity) throw new RangeError(`Cible ${target.kind} ${target.index} inexistante`);
    return identity;
  }

  /** Point du sol visé à la souris (calculé par l'application depuis la caméra), ou null. */
  setAimPoint(point: THREE.Vector3 | null): void {
    this.aimPoint = point;
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
    // Chaque terminal piraté recharge gadget et pistolet : apprendre donne des moyens d'agir.
    if (this.hasAnyGadget) this.charges = Math.min(MAX_CHARGES, this.charges + 1);
    this.ammo = Math.min(MAX_AMMO, this.ammo + 1);
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

  captureState(): MissionProgressState {
    const indexesWhere = <T>(items: T[], predicate: (item: T) => boolean): number[] =>
      items.flatMap((item, index) => (predicate(item) ? [index] : []));
    return {
      hackedTerminals: indexesWhere(this.terminals, (terminal) => terminal.hacked),
      collectedIntel: indexesWhere(this.intel, (pickup) => pickup.collected),
      neutralizedGuards: indexesWhere(this.guards, (guard) => guard.neutralized),
      firewalledCameras: indexesWhere(this.cameras, (camera) => camera.firewalled),
      charges: this.charges,
      ammo: this.ammo,
      livesLeft: this.livesLeft,
      detections: this.detections,
      neutralizations: this.neutralizations,
      elapsedSeconds: this.elapsedSeconds,
      playerCell: { x: Math.floor(this.player.position.x), z: Math.floor(this.player.position.z) },
    };
  }

  /**
   * Réapplique un état sauvegardé. Renvoie false (sans rien modifier) si l'état ne correspond pas
   * à ce niveau : une sauvegarde d'une ancienne version du jeu ne doit pas produire un état incohérent.
   */
  restoreState(state: MissionProgressState): boolean {
    const inRange = (indexes: number[], length: number): boolean => indexes.every((index) => index >= 0 && index < length);
    const isValid =
      inRange(state.hackedTerminals, this.terminals.length) &&
      inRange(state.collectedIntel, this.intel.length) &&
      inRange(state.neutralizedGuards, this.guards.length) &&
      inRange(state.firewalledCameras, this.cameras.length) &&
      state.livesLeft > 0;
    if (!isValid) return false;

    for (const index of state.hackedTerminals) this.terminals[index]?.markHacked();
    for (const index of state.collectedIntel) this.intel[index]?.collect();
    for (const index of state.neutralizedGuards) this.guards[index]?.neutralize(true);
    for (const index of state.firewalledCameras) this.cameras[index]?.firewall();
    this.ammo = Math.min(MAX_AMMO, state.ammo);
    if (this.terminals.every((terminal) => terminal.hacked)) this.extraction.unlock();
    this.charges = Math.min(MAX_CHARGES, state.charges);
    this.livesLeft = state.livesLeft;
    this.detections = state.detections;
    this.neutralizations = state.neutralizations;
    this.elapsedSeconds = state.elapsedSeconds;
    // Position sauvegardée seulement si elle est praticable ; sinon retour au point d'insertion.
    const cell = this.layout.grid.isWalkable(state.playerCell.x, state.playerCell.z) ? state.playerCell : this.layout.start;
    this.player.placeAt(cellToWorld(cell));
    this.graceSeconds = RESPAWN_GRACE_SECONDS;
    this.snapCamera();
    return true;
  }

  /** Commande juste : sentinelle arrêtée ou caméra coupée au pare-feu ; une charge est consommée. */
  neutralizeByCommand(target: TargetRef): void {
    if (target.kind === "camera") {
      const camera = this.cameras[target.index];
      if (!camera || camera.firewalled) return;
      camera.firewall();
    } else {
      const guard = this.requireGuard(target.index);
      if (guard.neutralized) return;
      guard.neutralize();
      this.neutralizations++;
    }
    this.charges = Math.max(0, this.charges - 1);
  }

  /** Commande ratée : du bruit près du joueur, la cible (si c'est une sentinelle) vient voir. */
  commandFailedOn(target: TargetRef): void {
    const playerCell = { x: Math.floor(this.player.position.x), z: Math.floor(this.player.position.z) };
    if (target.kind === "sentinel") this.requireGuard(target.index).alertTo(playerCell);
    else this.alertGuardsNear(this.player.position, SHOT_NOISE_RADIUS, playerCell);
  }

  hudState(): HudState {
    const commandTarget = this.commandTargetIndex();
    return {
      livesLeft: this.livesLeft,
      hackedCount: this.hackedCount,
      terminalCount: this.terminals.length,
      intelCollected: this.intelCollected,
      intelTotal: this.intelTotal,
      exposure: Math.max(
        this.guards.reduce((highest, guard) => Math.max(highest, guard.awareness), 0),
        this.cameras.reduce((highest, camera) => Math.max(highest, camera.alarm), 0),
      ),
      posture: this.player.posture,
      nightVision: this.nightVision,
      contextAction: this.contextAction(),
      gadgetAvailable: this.hasAnyGadget,
      charges: this.charges,
      commandTargetLabel: commandTarget === null ? null : this.targetIdentity(commandTarget).containerName,
      ammo: this.ammo,
      shotTargetLabel: this.shotLabel(),
    };
  }

  minimapSnapshot(): MinimapSnapshot {
    return {
      layout: this.layout,
      player: this.player.position,
      guards: this.guards.map((guard) => ({ position: guard.position, heading: guard.heading, neutralized: guard.neutralized })),
      cameras: this.cameras.map((camera) => ({ cell: camera.slot.floorCell, active: camera.isActive(this.elapsedSeconds) })),
      terminals: this.terminals.map((terminal) => ({ cell: terminal.slot.cell, hacked: terminal.hacked })),
      intel: this.intel.map((pickup) => ({ cell: pickup.cell, collected: pickup.collected })),
      exitUnlocked: this.extraction.unlocked,
    };
  }

  tick(deltaSeconds: number, elapsedSeconds: number): void {
    this.visuals.update(elapsedSeconds);
    for (const terminal of this.terminals) terminal.update(elapsedSeconds);
    for (const pickup of this.intel) pickup.update(elapsedSeconds);
    this.extraction.update(elapsedSeconds);
    if (this.paused || this.finished) return;

    this.elapsedSeconds += deltaSeconds;
    this.noticeCooldown = Math.max(0, this.noticeCooldown - deltaSeconds);
    this.cameraCallCooldown = Math.max(0, this.cameraCallCooldown - deltaSeconds);
    this.updateTracers(deltaSeconds);
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
    if (this.input.consume("shoot")) this.shoot();
    return false;
  }

  /** Neutraliser passe avant pirater : une sentinelle dans le dos est une urgence. */
  private contextAction(): HudState["contextAction"] {
    if (this.takedownCandidate()) return { kind: "takedown", label: "Neutraliser la sentinelle" };
    const terminal = this.nearbyTerminal();
    if (!terminal) return null;
    return { kind: "hack", label: terminal.kind === "console" ? "Ouvrir la console principale" : `Pirater ${terminal.label}` };
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

  private get hasAnyGadget(): boolean {
    return this.options.gadgetTargets.sentinel || this.options.gadgetTargets.camera;
  }

  private requestCommand(): boolean {
    if (!this.hasAnyGadget) {
      this.notice("Aucun gadget pour l'instant : approche les sentinelles par derrière (E) pour les neutraliser.");
      return false;
    }
    if (this.charges === 0) {
      this.notice("Gadget déchargé : pirate un terminal pour gagner une charge.");
      return false;
    }
    const targetIndex = this.commandTargetIndex();
    if (targetIndex === null) {
      this.notice(this.options.gadgetTargets.camera ? "Aucune sentinelle ni caméra en vue à portée du gadget." : "Aucune sentinelle en vue à portée du gadget.");
      return false;
    }
    this.pause();
    this.callbacks.onCommandRequested(targetIndex);
    return true;
  }

  private takedownCandidate(): Guard | null {
    return this.guards.find((guard) => guard.canBeTakenDownFrom(this.player.position)) ?? null;
  }

  /**
   * Cible du gadget : à la souris, la cible compatible pointée (on choisit qui viser quand une caméra
   * et une sentinelle sont visibles) ; sinon la cible compatible la plus proche.
   */
  private commandTargetIndex(): TargetRef | null {
    if (!this.hasAnyGadget || this.charges === 0) return null;
    const accept = (target: TargetRef): boolean => this.options.gadgetTargets[target.kind];
    if (this.aimPoint) {
      const aimed = this.aimedTarget(COMMAND_RANGE, accept);
      if (aimed) return aimed.ref;
    }
    return this.nearestTarget(COMMAND_RANGE, accept);
  }

  /** Toutes les cibles encore actives, avec leur position au sol. */
  private liveTargets(): { ref: TargetRef; position: THREE.Vector3 }[] {
    const targets: { ref: TargetRef; position: THREE.Vector3 }[] = [];
    this.guards.forEach((guard, index) => {
      if (!guard.neutralized) targets.push({ ref: { kind: "sentinel", index }, position: guard.position });
    });
    this.cameras.forEach((camera, index) => {
      if (camera.isActive(this.elapsedSeconds)) targets.push({ ref: { kind: "camera", index }, position: camera.position });
    });
    return targets;
  }

  private isInSight(position: THREE.Vector3, range: number): boolean {
    const distance = Math.hypot(position.x - this.player.position.x, position.z - this.player.position.z);
    return distance <= range && hasLineOfSight(this.layout.grid, this.player.position.x, this.player.position.z, position.x, position.z);
  }

  private nearestTarget(range: number, accept: (target: TargetRef) => boolean): TargetRef | null {
    let best: TargetRef | null = null;
    let bestDistance = Infinity;
    for (const target of this.liveTargets()) {
      if (!accept(target.ref) || !this.isInSight(target.position, range)) continue;
      const distance = target.position.distanceTo(this.player.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = target.ref;
      }
    }
    return best;
  }

  /**
   * Cible du pistolet : à la souris, la cible la plus proche de la direction visée (tolérance ~14°) ;
   * sans souris (tactile), la cible visible la plus proche — l'auto-visée compense l'absence de curseur.
   */
  private shotTarget(): { ref: TargetRef; position: THREE.Vector3 } | null {
    const visible = this.liveTargets().filter((target) => this.isInSight(target.position, SHOT_RANGE));
    if (visible.length === 0) return null;
    if (!this.aimPoint) {
      return visible.reduce((best, target) =>
        target.position.distanceTo(this.player.position) < best.position.distanceTo(this.player.position) ? target : best,
      );
    }
    return this.aimedTarget(SHOT_RANGE, () => true);
  }

  /** Cible visible la plus proche de la direction pointée par la souris (tolérance ~14°). */
  private aimedTarget(range: number, accept: (target: TargetRef) => boolean): { ref: TargetRef; position: THREE.Vector3 } | null {
    if (!this.aimPoint) return null;
    const visible = this.liveTargets().filter((target) => accept(target.ref) && this.isInSight(target.position, range));
    const aimAngle = Math.atan2(this.aimPoint.z - this.player.position.z, this.aimPoint.x - this.player.position.x);
    let best: { ref: TargetRef; position: THREE.Vector3 } | null = null;
    let bestOffset = AIM_TOLERANCE_RADIANS;
    for (const target of visible) {
      const angle = Math.atan2(target.position.z - this.player.position.z, target.position.x - this.player.position.x);
      const offset = Math.abs(Math.atan2(Math.sin(angle - aimAngle), Math.cos(angle - aimAngle)));
      if (offset <= bestOffset) {
        bestOffset = offset;
        best = target;
      }
    }
    return best;
  }

  private shotLabel(): string | null {
    const target = this.shotTarget();
    return target ? this.targetIdentity(target.ref).containerName : null;
  }

  /** Tir IEM : touche la cible visée, sinon part dans la direction de visée jusqu'au premier mur. */
  private shoot(): void {
    if (this.ammo === 0) {
      this.notice("Plus de munitions IEM : pirate un terminal pour recharger.");
      return;
    }
    this.ammo--;
    const target = this.shotTarget();
    let impact: THREE.Vector3;
    let result: ShotResult = "miss";
    if (target) {
      impact = new THREE.Vector3(target.position.x, target.ref.kind === "camera" ? 2 : 1, target.position.z);
      if (target.ref.kind === "sentinel") {
        this.requireGuard(target.ref.index).neutralize();
        this.neutralizations++;
        result = "sentinel";
      } else {
        this.cameras[target.ref.index]?.disableUntil(this.elapsedSeconds + CAMERA_EMP_SECONDS);
        result = "camera";
      }
    } else {
      const angle = this.aimPoint
        ? Math.atan2(this.aimPoint.z - this.player.position.z, this.aimPoint.x - this.player.position.x)
        : this.player.facingMathAngle;
      const reach = castRay(this.layout.grid, this.player.position.x, this.player.position.z, angle, SHOT_RANGE);
      impact = new THREE.Vector3(this.player.position.x + Math.cos(angle) * reach, 1, this.player.position.z + Math.sin(angle) * reach);
    }
    this.player.aimAt(impact.x, impact.z);
    this.spawnTracer(this.player.muzzlePosition(), impact);
    // L'IEM claque : les sentinelles proches viennent voir d'où vient le bruit.
    this.alertGuardsNear(this.player.position, SHOT_NOISE_RADIUS, { x: Math.floor(this.player.position.x), z: Math.floor(this.player.position.z) });
    this.callbacks.onShot(result);
  }

  private alertGuardsNear(origin: THREE.Vector3, radius: number, noiseCell: Cell): void {
    for (const guard of this.guards) {
      if (!guard.neutralized && guard.position.distanceTo(origin) <= radius) guard.investigate(noiseCell);
    }
  }

  private spawnTracer(from: THREE.Vector3, to: THREE.Vector3): void {
    const length = from.distanceTo(to);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 4, 5), transparent: true, opacity: 1, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length, 6, 1, true), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: TRACER_LIFETIME_SECONDS });
  }

  private updateTracers(deltaSeconds: number): void {
    for (let index = this.tracers.length - 1; index >= 0; index--) {
      const tracer = this.tracers[index] as (typeof this.tracers)[number];
      tracer.life -= deltaSeconds;
      tracer.mesh.material.opacity = Math.max(0, tracer.life / TRACER_LIFETIME_SECONDS);
      if (tracer.life > 0) continue;
      this.scene.remove(tracer.mesh);
      tracer.mesh.geometry.dispose();
      tracer.mesh.material.dispose();
      this.tracers.splice(index, 1);
    }
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
    for (const camera of this.cameras) {
      camera.update(deltaSeconds, this.elapsedSeconds, playerSnapshot);
      // Une caméra qui te voit appelle les sentinelles proches avant même de déclencher l'alarme.
      if (camera.alarm >= 0.5 && this.cameraCallCooldown === 0) {
        this.alertGuardsNear(camera.position, CAMERA_CALL_RADIUS, { x: Math.floor(this.player.position.x), z: Math.floor(this.player.position.z) });
        this.cameraCallCooldown = CAMERA_CALL_COOLDOWN_SECONDS;
        this.notice("Une caméra t'a repéré : des sentinelles arrivent !");
      }
    }
    if (this.guards.some((guard) => guard.awareness >= 1) || this.cameras.some((camera) => camera.alarm >= 1)) this.handleDetection();
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
    for (const camera of this.cameras) camera.resetAlarm();
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
    const commandTarget = this.commandTargetIndex();
    const commandPosition = commandTarget ? this.targetPosition(commandTarget) : null;
    this.targetMarker.visible = commandPosition !== null;
    if (commandPosition) {
      this.targetMarker.position.set(commandPosition.x, 0.05, commandPosition.z);
      this.targetMarker.rotation.z = elapsedSeconds * 1.5;
    }
    // Réticule rouge du pistolet : seulement quand on vise à la souris une cible précise.
    const shotTarget = this.aimPoint && this.ammo > 0 ? this.shotTarget() : null;
    this.aimMarker.visible = shotTarget !== null;
    if (shotTarget) {
      this.aimMarker.position.set(shotTarget.position.x, 0.07, shotTarget.position.z);
      this.aimMarker.rotation.z = -elapsedSeconds * 2.5;
    }
  }

  private targetPosition(target: TargetRef): THREE.Vector3 | null {
    return target.kind === "sentinel" ? (this.guards[target.index]?.position ?? null) : (this.cameras[target.index]?.position ?? null);
  }

  private requireGuard(guardIndex: number): Guard {
    const guard = this.guards[guardIndex];
    if (!guard) throw new RangeError(`Sentinelle ${guardIndex} inexistante`);
    return guard;
  }

  private followCamera(deltaSeconds: number): void {
    this.followShadowLight();
    this.cameraTarget.copy(this.player.position).add(this.cameraOffset);
    // Lissage indépendant du framerate (exponentiel) : même ressenti à 30 ou 144 FPS.
    this.camera.position.lerp(this.cameraTarget, 1 - Math.exp(-deltaSeconds * 6));
    this.camera.lookAt(this.player.position.x, 0.5, this.player.position.z);
  }

  /** La carte d'ombres ne couvre que les alentours du joueur : on la déplace avec lui (bien plus net que tout le niveau). */
  private followShadowLight(): void {
    if (!this.shadowLight) return;
    this.shadowLight.target.position.copy(this.player.position);
    this.shadowLight.position.copy(this.player.position).add(SHADOW_LIGHT_OFFSET);
  }

  private snapCamera(): void {
    this.followShadowLight();
    this.camera.position.copy(this.player.position).add(this.cameraOffset);
    this.camera.lookAt(this.player.position.x, 0.5, this.player.position.z);
  }
}

/** Réticule au sol sous la cible visée (bleu : gadget, rouge : pistolet). */
function createTargetMarker(color: number): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.62, 4, 1),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  return marker;
}

function createShadowLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xa8c4ff, 0.9);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0008;
  light.shadow.normalBias = 0.03;
  const shadowCamera = light.shadow.camera;
  shadowCamera.left = -SHADOW_AREA_HALF_SIZE;
  shadowCamera.right = SHADOW_AREA_HALF_SIZE;
  shadowCamera.top = SHADOW_AREA_HALF_SIZE;
  shadowCamera.bottom = -SHADOW_AREA_HALF_SIZE;
  shadowCamera.near = 1;
  shadowCamera.far = 30;
  return light;
}
