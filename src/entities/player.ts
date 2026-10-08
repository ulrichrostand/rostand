import * as THREE from "three";
import type { Grid } from "../core/grid";
import type { MoveIntent } from "../core/input";

export type Posture = "standing" | "crouching" | "running";

const COLLISION_RADIUS = 0.28;
const SPEED_BY_POSTURE: Record<Posture, number> = { standing: 3, crouching: 1.6, running: 5 };

export class Player {
  readonly root = new THREE.Group();
  readonly position = new THREE.Vector3();
  crouched = false;
  posture: Posture = "standing";
  isMoving = false;
  private readonly body: THREE.Group;
  private facing = 0;
  private stepPhase = 0;

  constructor(private readonly grid: Grid) {
    this.body = createAgentModel();
    this.root.add(this.body);
    // Lampe frontale discrète : le joueur garde de la lisibilité dans les zones d'ombre.
    const lamp = new THREE.PointLight(0x9dffb0, 4, 5, 1.5);
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
    this.animate();
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

  private animate(): void {
    this.root.position.copy(this.position);
    this.body.rotation.y = this.facing;
    const crouchScale = this.crouched ? 0.68 : 1;
    this.body.scale.y += (crouchScale - this.body.scale.y) * 0.25;
    this.body.position.y = this.isMoving ? Math.abs(Math.sin(this.stepPhase)) * 0.05 : 0;
  }
}

export function rotateTowards(current: number, target: number, maxStep: number): number {
  let difference = target - current;
  difference = Math.atan2(Math.sin(difference), Math.cos(difference));
  if (Math.abs(difference) <= maxStep) return target;
  return current + Math.sign(difference) * maxStep;
}

/** Silhouette d'agent : combinaison sombre et les trois optiques vertes caractéristiques. */
function createAgentModel(): THREE.Group {
  const model = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0x1b2026, roughness: 0.6, metalness: 0.3 });
  const gear = new THREE.MeshStandardMaterial({ color: 0x2c333b, roughness: 0.5 });
  const optics = new THREE.MeshStandardMaterial({ color: 0x39ff88, emissive: 0x39ff88, emissiveIntensity: 2.5 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 10), suit);
  torso.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), suit);
  head.position.y = 1.42;
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.16), gear);
  backpack.position.set(0, 0.95, -0.24);
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 4, 8), suit);
  legs.position.y = 0.35;
  model.add(torso, head, backpack, legs);

  const lensOffsets = [-0.07, 0, 0.07];
  for (const offsetX of lensOffsets) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), optics);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(offsetX, 1.47, 0.17);
    model.add(lens);
  }
  return model;
}
