import * as THREE from "three";
import type { Grid } from "../core/grid";
import type { MoveIntent } from "../core/input";
import { createAgentRig, poseRig, type HumanoidRig } from "./rig";

export type Posture = "standing" | "crouching" | "running";

const COLLISION_RADIUS = 0.28;
const SPEED_BY_POSTURE: Record<Posture, number> = { standing: 3, crouching: 1.6, running: 5 };

export class Player {
  readonly root = new THREE.Group();
  readonly position = new THREE.Vector3();
  crouched = false;
  posture: Posture = "standing";
  isMoving = false;
  private readonly rig: HumanoidRig;
  private facing = 0;
  private stepPhase = 0;
  private stride = 0;
  private crouchAmount = 0;

  constructor(private readonly grid: Grid) {
    this.rig = createAgentRig().rig;
    this.root.add(this.rig.root);
    // Lampe frontale discrète : le joueur garde de la lisibilité dans les zones d'ombre.
    const lamp = new THREE.PointLight(0x9dffb0, 2.2, 4.5, 1.6);
    lamp.position.set(0, 1.6, 0);
    this.root.add(lamp);
  }

  placeAt(position: THREE.Vector3): void {
    this.position.copy(position);
    this.root.position.copy(position);
  }

  update(deltaSeconds: number, intent: MoveIntent): void {
    this.isMoving = intent.x !== 0 || intent.z !== 0;
    this.posture = this.crouched ? "crouching" : intent.running && this.isMoving ? "running" : "standing";
    const distance = SPEED_BY_POSTURE[this.posture] * deltaSeconds;

    if (this.isMoving) {
      // Axes résolus séparément : le joueur glisse le long des murs au lieu de se bloquer.
      this.tryMove(intent.x * distance, 0);
      this.tryMove(0, intent.z * distance);
      const targetFacing = Math.atan2(intent.x, intent.z);
      this.facing = rotateTowards(this.facing, targetFacing, deltaSeconds * 12);
      this.stepPhase += deltaSeconds * (this.posture === "running" ? 16 : 10);
    }
    this.animate(deltaSeconds);
  }

  private tryMove(deltaX: number, deltaZ: number): void {
    const nextX = this.position.x + deltaX;
    const nextZ = this.position.z + deltaZ;
    if (this.collides(nextX, nextZ)) return;
    this.position.x = nextX;
    this.position.z = nextZ;
  }

  private collides(x: number, z: number): boolean {
    const minX = Math.floor(x - COLLISION_RADIUS);
    const maxX = Math.floor(x + COLLISION_RADIUS);
    const minZ = Math.floor(z - COLLISION_RADIUS);
    const maxZ = Math.floor(z + COLLISION_RADIUS);
    for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
      for (let cellX = minX; cellX <= maxX; cellX++) {
        if (!this.grid.isWalkable(cellX, cellZ)) return true;
      }
    }
    return false;
  }

  private animate(deltaSeconds: number): void {
    this.root.position.copy(this.position);
    this.rig.root.rotation.y = this.facing;
    // Transitions lissées : on passe en douceur de l'arrêt à la course, et de debout à accroupi.
    const smoothing = 1 - Math.exp(-deltaSeconds * 10);
    const targetStride = this.isMoving ? (this.posture === "running" ? 1 : this.posture === "crouching" ? 0.45 : 0.7) : 0;
    this.stride += (targetStride - this.stride) * smoothing;
    this.crouchAmount += ((this.crouched ? 1 : 0) - this.crouchAmount) * smoothing;
    poseRig(this.rig, this.stepPhase, this.stride, this.crouchAmount);
  }
}

export function rotateTowards(current: number, target: number, maxStep: number): number {
  let difference = target - current;
  difference = Math.atan2(Math.sin(difference), Math.cos(difference));
  if (Math.abs(difference) <= maxStep) return target;
  return current + Math.sign(difference) * maxStep;
}
