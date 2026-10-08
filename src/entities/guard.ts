import * as THREE from "three";
import { castRay, findPath, hasLineOfSight, type Cell, type Grid } from "../core/grid";
import type { GuardRoute } from "../level/generator";
import { cellToWorld } from "../level/levelScene";
import type { Posture } from "./player";

export type GuardState = "patrol" | "suspicious" | "investigate" | "returning";

export interface GuardTuning {
  walkSpeed: number;
  visionRange: number;
  fieldOfViewRadians: number;
  /** Multiplie la vitesse de remplissage de la jauge de détection. */
  detectionRate: number;
}

export interface PlayerSnapshot {
  position: THREE.Vector3;
  posture: Posture;
  isMoving: boolean;
}

/** Facteurs de discrétion : s'accroupir réduit fortement la portée de vue, courir l'augmente. */
const POSTURE_VISIBILITY: Record<Posture, number> = { crouching: 0.55, standing: 1, running: 1.2 };
const HEARING_RADIUS_RUNNING = 2.6;
const AWARENESS_DECAY_PER_SECOND = 0.28;
const SUSPICION_THRESHOLD = 0.3;
const INVESTIGATION_THRESHOLD = 0.5;
const PATROL_PAUSE_SECONDS = 1.3;
const INVESTIGATION_WAIT_SECONDS = 2.5;
const CONE_SEGMENTS = 22;
const ARRIVAL_EPSILON = 0.05;
const TAKEDOWN_RANGE = 1.35;
/** Le joueur doit être dans le dos : angle > ~110° par rapport au regard du garde. */
const TAKEDOWN_BEHIND_COSINE = -0.34;
const NOISE_AWARENESS_BOOST = 0.35;
const FALL_SPEED = 5;
const CALM_CONE_COLOR = new THREE.Color(0xffd54a);
const ALERT_CONE_COLOR = new THREE.Color(0xff2d2d);

export class Guard {
  readonly root = new THREE.Group();
  readonly position = new THREE.Vector3();
  /** Cap en convention mathématique : direction = (cos, sin) dans le plan XZ. */
  heading = 0;
  awareness = 0;
  state: GuardState = "patrol";
  /** Neutralisé (au corps à corps ou par commande) : définitif pour la mission. */
  neutralized = false;

  private readonly body: THREE.Group;
  private readonly visorMaterial: THREE.MeshStandardMaterial;
  private fallProgress = 0;
  private readonly cone: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly conePositions: Float32Array;
  private patrolIndex = 0;
  private patrolDirection: 1 | -1 = 1;
  private detour: Cell[] = [];
  private detourIndex = 0;
  private waitTimer = 0;
  private lastSeenCell: Cell | null = null;

  constructor(
    private readonly grid: Grid,
    private readonly route: GuardRoute,
    private readonly tuning: GuardTuning,
  ) {
    const model = createGuardModel();
    this.body = model.group;
    this.visorMaterial = model.visorMaterial;
    this.root.add(this.body);
    const { mesh, positions } = createVisionCone();
    this.cone = mesh;
    this.conePositions = positions;
    this.reset();
  }

  /** Mesh à ajouter séparément : le cône est en coordonnées monde, pas enfant du garde. */
  get visionCone(): THREE.Object3D {
    return this.cone;
  }

  /** Remet le garde en début de ronde. Un garde neutralisé le reste. */
  reset(): void {
    if (this.neutralized) return;
    const firstCell = this.route.waypoints[0] as Cell;
    const secondCell = this.route.waypoints[1] ?? firstCell;
    this.position.copy(cellToWorld(firstCell));
    this.heading = Math.atan2(secondCell.z - firstCell.z, secondCell.x - firstCell.x);
    this.patrolIndex = 0;
    this.patrolDirection = 1;
    this.awareness = 0;
    this.state = "patrol";
    this.detour = [];
    this.waitTimer = 0;
    this.lastSeenCell = null;
    this.syncVisuals();
  }

  /** Bruit (mauvaise réponse sur un terminal) : le garde vient vérifier la zone. */
  investigate(target: Cell): void {
    if (this.neutralized) return;
    const path = findPath(this.grid, this.currentCell(), target);
    if (!path) return;
    this.state = "investigate";
    this.detour = path;
    this.detourIndex = 0;
    this.waitTimer = INVESTIGATION_WAIT_SECONDS;
  }

  /** Commande ratée contre ce garde : il sursaute et vient voir d'où ça vient. */
  alertTo(noiseCell: Cell): void {
    if (this.neutralized) return;
    // Plafonné sous 1 : le bruit attire la sentinelle mais ne vaut pas une détection immédiate.
    this.awareness = Math.min(0.9, this.awareness + NOISE_AWARENESS_BOOST);
    this.investigate(noiseCell);
  }

  /**
   * Neutralisation silencieuse possible : garde actif, pas en alerte, joueur tout proche et dans son dos.
   * C'est la récompense de l'infiltration : approcher sans être vu.
   */
  canBeTakenDownFrom(playerPosition: THREE.Vector3): boolean {
    if (this.neutralized || this.awareness >= INVESTIGATION_THRESHOLD) return false;
    const deltaX = playerPosition.x - this.position.x;
    const deltaZ = playerPosition.z - this.position.z;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance > TAKEDOWN_RANGE || distance === 0) return false;
    const facingDot = (Math.cos(this.heading) * deltaX + Math.sin(this.heading) * deltaZ) / distance;
    return facingDot <= TAKEDOWN_BEHIND_COSINE;
  }

  neutralize(): void {
    if (this.neutralized) return;
    this.neutralized = true;
    this.awareness = 0;
    this.cone.visible = false;
    this.visorMaterial.emissiveIntensity = 0;
    this.visorMaterial.color.setHex(0x331111);
  }

  /** `player` à null = joueur imperceptible (invulnérabilité de réapparition). */
  update(deltaSeconds: number, player: PlayerSnapshot | null): boolean {
    if (this.neutralized) {
      this.animateFall(deltaSeconds);
      return false;
    }
    const seesPlayer = player !== null && this.canPerceive(player);
    this.updateAwareness(deltaSeconds, seesPlayer ? player : null);

    switch (this.state) {
      case "patrol":
        this.updatePatrol(deltaSeconds);
        break;
      case "suspicious":
        this.updateSuspicious(deltaSeconds, seesPlayer ? player : null);
        break;
      case "investigate":
        this.updateInvestigate(deltaSeconds);
        break;
      case "returning":
        if (this.followDetour(deltaSeconds)) this.state = "patrol";
        break;
    }
    this.syncVisuals();
    return seesPlayer;
  }

  private canPerceive(player: PlayerSnapshot): boolean {
    const deltaX = player.position.x - this.position.x;
    const deltaZ = player.position.z - this.position.z;
    const distance = Math.hypot(deltaX, deltaZ);
    const hasSight = (): boolean =>
      hasLineOfSight(this.grid, this.position.x, this.position.z, player.position.x, player.position.z);

    if (player.posture === "running" && player.isMoving && distance < HEARING_RADIUS_RUNNING) return hasSight();

    const effectiveRange = this.tuning.visionRange * POSTURE_VISIBILITY[player.posture];
    if (distance > effectiveRange) return false;
    const angleToPlayer = Math.atan2(deltaZ, deltaX);
    const angleDifference = Math.abs(Math.atan2(Math.sin(angleToPlayer - this.heading), Math.cos(angleToPlayer - this.heading)));
    if (angleDifference > this.tuning.fieldOfViewRadians / 2) return false;
    return hasSight();
  }

  private updateAwareness(deltaSeconds: number, seenPlayer: PlayerSnapshot | null): void {
    if (seenPlayer) {
      const player = seenPlayer;
      const distance = Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z);
      const closeness = 1 - Math.min(distance / this.tuning.visionRange, 1);
      // Plus le joueur est proche, plus la détection est rapide : on laisse une chance à distance.
      this.awareness += deltaSeconds * this.tuning.detectionRate * (0.55 + 1.5 * closeness);
      this.lastSeenCell = { x: Math.floor(player.position.x), z: Math.floor(player.position.z) };
      if (this.awareness >= SUSPICION_THRESHOLD && this.state !== "suspicious") this.state = "suspicious";
    } else {
      this.awareness -= deltaSeconds * AWARENESS_DECAY_PER_SECOND;
    }
    this.awareness = THREE.MathUtils.clamp(this.awareness, 0, 1);
  }

  private updatePatrol(deltaSeconds: number): void {
    if (this.waitTimer > 0) {
      this.waitTimer -= deltaSeconds;
      // Balayage du regard pendant la pause : les extrémités de ronde restent dangereuses.
      this.heading += Math.sin(this.waitTimer * 2.4) * deltaSeconds * 1.6;
      return;
    }
    const target = this.route.waypoints[this.patrolIndex] as Cell;
    if (!this.moveTowards(target, deltaSeconds)) return;

    const lastIndex = this.route.waypoints.length - 1;
    const nextIndex = this.patrolIndex + this.patrolDirection;
    if (nextIndex < 0 || nextIndex > lastIndex) {
      this.patrolDirection = this.patrolDirection === 1 ? -1 : 1;
      this.waitTimer = PATROL_PAUSE_SECONDS;
    }
    this.patrolIndex = THREE.MathUtils.clamp(this.patrolIndex + this.patrolDirection, 0, lastIndex);
  }

  private updateSuspicious(deltaSeconds: number, seenPlayer: PlayerSnapshot | null): void {
    if (seenPlayer) {
      const player = seenPlayer;
      const angleToPlayer = Math.atan2(player.position.z - this.position.z, player.position.x - this.position.x);
      this.heading = turnTowards(this.heading, angleToPlayer, deltaSeconds * 4);
      return;
    }
    if (this.awareness >= INVESTIGATION_THRESHOLD && this.lastSeenCell) {
      this.investigate(this.lastSeenCell);
      return;
    }
    if (this.awareness <= 0) this.returnToPatrol();
  }

  private updateInvestigate(deltaSeconds: number): void {
    if (!this.followDetour(deltaSeconds)) return;
    this.waitTimer -= deltaSeconds;
    this.heading += deltaSeconds * 1.8;
    if (this.waitTimer <= 0) this.returnToPatrol();
  }

  private returnToPatrol(): void {
    const target = this.route.waypoints[this.patrolIndex] as Cell;
    const path = findPath(this.grid, this.currentCell(), target);
    this.detour = path ?? [];
    this.detourIndex = 0;
    this.state = path ? "returning" : "patrol";
  }

  /** Avance le long du détour ; renvoie true une fois arrivé au bout. */
  private followDetour(deltaSeconds: number): boolean {
    const target = this.detour[this.detourIndex];
    if (!target) return true;
    if (this.moveTowards(target, deltaSeconds)) this.detourIndex++;
    return this.detourIndex >= this.detour.length;
  }

  /** Renvoie true si la cible est atteinte. */
  private moveTowards(cell: Cell, deltaSeconds: number): boolean {
    const targetX = cell.x + 0.5;
    const targetZ = cell.z + 0.5;
    const deltaX = targetX - this.position.x;
    const deltaZ = targetZ - this.position.z;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance < ARRIVAL_EPSILON) return true;
    const speed = this.state === "investigate" ? this.tuning.walkSpeed * 1.35 : this.tuning.walkSpeed;
    const step = Math.min(distance, speed * deltaSeconds);
    this.position.x += (deltaX / distance) * step;
    this.position.z += (deltaZ / distance) * step;
    this.heading = turnTowards(this.heading, Math.atan2(deltaZ, deltaX), deltaSeconds * 6);
    return step >= distance - ARRIVAL_EPSILON;
  }

  private animateFall(deltaSeconds: number): void {
    if (this.fallProgress >= 1) return;
    this.fallProgress = Math.min(1, this.fallProgress + deltaSeconds * FALL_SPEED * (0.4 + this.fallProgress));
    // Bascule vers l'arrière autour des pieds, comme un robot qui s'effondre.
    this.body.rotation.x = -this.fallProgress * (Math.PI / 2);
    this.body.position.y = this.fallProgress * 0.18;
  }

  private currentCell(): Cell {
    return { x: Math.floor(this.position.x), z: Math.floor(this.position.z) };
  }

  private syncVisuals(): void {
    this.root.position.copy(this.position);
    // Le modèle regarde vers +Z : conversion du cap mathématique vers la rotation Y de Three.js.
    this.body.rotation.y = Math.PI / 2 - this.heading;
    this.updateCone();
  }

  private updateCone(): void {
    const halfFov = this.tuning.fieldOfViewRadians / 2;
    for (let segment = 0; segment <= CONE_SEGMENTS; segment++) {
      const angle = this.heading - halfFov + (this.tuning.fieldOfViewRadians * segment) / CONE_SEGMENTS;
      const reach = castRay(this.grid, this.position.x, this.position.z, angle, this.tuning.visionRange);
      const offset = (segment + 1) * 3;
      this.conePositions[offset] = Math.cos(angle) * reach;
      this.conePositions[offset + 2] = Math.sin(angle) * reach;
    }
    const geometry = this.cone.geometry;
    (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    geometry.computeBoundingSphere();
    this.cone.position.set(this.position.x, 0.04, this.position.z);
    this.cone.material.color.copy(CALM_CONE_COLOR).lerp(ALERT_CONE_COLOR, this.awareness);
    this.cone.material.opacity = 0.16 + this.awareness * 0.3;
  }
}

function turnTowards(current: number, target: number, maxStep: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  if (Math.abs(difference) <= maxStep) return target;
  return current + Math.sign(difference) * maxStep;
}

function createVisionCone(): { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; positions: Float32Array } {
  // Éventail : sommet au centre (index 0) puis CONE_SEGMENTS + 1 points sur l'arc.
  const positions = new Float32Array((CONE_SEGMENTS + 2) * 3);
  const indices: number[] = [];
  for (let segment = 1; segment <= CONE_SEGMENTS; segment++) indices.push(0, segment + 1, segment);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color: CALM_CONE_COLOR,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return { mesh: new THREE.Mesh(geometry, material), positions };
}

function createGuardModel(): { group: THREE.Group; visorMaterial: THREE.MeshStandardMaterial } {
  const model = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0x3a1f24, roughness: 0.5, metalness: 0.4 });
  // Matériau propre à chaque garde : éteindre la visière d'un garde ne doit pas éteindre les autres.
  const visorMaterial = new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0xff2d2d, emissiveIntensity: 2.2 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.6, 4, 10), armor);
  torso.position.y = 0.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), armor);
  head.position.y = 1.52;
  const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.08), visorMaterial);
  visorBand.position.set(0, 1.54, 0.16);
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.35, 4, 8), armor);
  legs.position.y = 0.36;
  model.add(torso, head, visorBand, legs);
  return { group: model, visorMaterial };
}
