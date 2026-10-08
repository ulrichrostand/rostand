import * as THREE from "three";
import { castRay, hasLineOfSight, type Grid } from "../core/grid";
import type { CameraSlot } from "../level/generator";
import type { PlayerSnapshot } from "./guard";
import type { Posture } from "./player";

const MOUNT_HEIGHT = 2.05;
const VISION_RANGE = 6.5;
const FIELD_OF_VIEW = (50 * Math.PI) / 180;
const SWEEP_AMPLITUDE = 0.85;
const SWEEP_PERIOD_SECONDS = 7;
const ALARM_RATE = 0.9;
const ALARM_DECAY_PER_SECOND = 0.35;
const CONE_SEGMENTS = 18;
/** Une caméra voit moins bien qu'une sentinelle un agent accroupi : elle est fixe et en hauteur. */
const POSTURE_VISIBILITY: Record<Posture, number> = { crouching: 0.6, standing: 1, running: 1.1 };
const CALM_COLOR = new THREE.Color(0xb388ff);
const ALERT_COLOR = new THREE.Color(0xff2d2d);

/** Caméra de surveillance : balaie la salle et donne l'alerte si elle voit l'agent trop longtemps. */
export class SecurityCamera {
  readonly root = new THREE.Group();
  /** Point d'observation au niveau du sol (sert aux lignes de vue et au ciblage). */
  readonly position: THREE.Vector3;
  heading: number;
  alarm = 0;
  firewalled = false;
  private disabledUntil = -Infinity;
  private readonly head: THREE.Group;
  private readonly ledMaterial: THREE.MeshStandardMaterial;
  private readonly cone: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly conePositions: Float32Array;
  private readonly phase: number;
  private readonly baseFacing: number;

  constructor(
    private readonly grid: Grid,
    readonly slot: CameraSlot,
  ) {
    this.baseFacing = slot.facing;
    this.heading = slot.facing;
    this.phase = (slot.wallCell.x * 13 + slot.wallCell.z * 7) % 10;
    // Juste devant le mur, côté salle : l'origine des rayons de vue est dans une case praticable.
    this.position = new THREE.Vector3(
      slot.wallCell.x + 0.5 + Math.cos(slot.facing) * 0.55,
      0,
      slot.wallCell.z + 0.5 + Math.sin(slot.facing) * 0.55,
    );
    const model = createCameraModel();
    this.head = model.head;
    this.ledMaterial = model.led;
    // Le support est fixé sur la face du mur (0,5 case depuis son centre).
    model.mount.position.set(slot.wallCell.x + 0.5 + Math.cos(slot.facing) * 0.5, MOUNT_HEIGHT, slot.wallCell.z + 0.5 + Math.sin(slot.facing) * 0.5);
    this.root.add(model.mount);
    const cone = createCone();
    this.cone = cone.mesh;
    this.conePositions = cone.positions;
    this.root.add(this.cone);
  }

  /** Coupée (IEM) ou neutralisée (pare-feu) : ne voit plus rien. */
  isActive(elapsedSeconds: number): boolean {
    return !this.firewalled && elapsedSeconds >= this.disabledUntil;
  }

  disableUntil(elapsedSeconds: number): void {
    this.disabledUntil = Math.max(this.disabledUntil, elapsedSeconds);
    this.alarm = 0;
  }

  firewall(): void {
    this.firewalled = true;
    this.alarm = 0;
  }

  resetAlarm(): void {
    this.alarm = 0;
  }

  /** Renvoie true si la caméra voit le joueur à cet instant. */
  update(deltaSeconds: number, elapsedSeconds: number, player: PlayerSnapshot | null): boolean {
    const active = this.isActive(elapsedSeconds);
    if (active) {
      this.heading = this.baseFacing + Math.sin(((elapsedSeconds + this.phase) / SWEEP_PERIOD_SECONDS) * Math.PI * 2) * SWEEP_AMPLITUDE;
    }
    const seesPlayer = active && player !== null && this.canSee(player);
    if (seesPlayer && player) {
      const distance = Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z);
      const closeness = 1 - Math.min(distance / VISION_RANGE, 1);
      this.alarm += deltaSeconds * ALARM_RATE * (0.6 + closeness);
    } else {
      this.alarm -= deltaSeconds * ALARM_DECAY_PER_SECOND;
    }
    this.alarm = THREE.MathUtils.clamp(this.alarm, 0, 1);
    this.syncVisuals(active, elapsedSeconds);
    return seesPlayer;
  }

  private canSee(player: PlayerSnapshot): boolean {
    const deltaX = player.position.x - this.position.x;
    const deltaZ = player.position.z - this.position.z;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance > VISION_RANGE * POSTURE_VISIBILITY[player.posture]) return false;
    const angle = Math.atan2(deltaZ, deltaX);
    const difference = Math.abs(Math.atan2(Math.sin(angle - this.heading), Math.cos(angle - this.heading)));
    if (difference > FIELD_OF_VIEW / 2) return false;
    return hasLineOfSight(this.grid, this.position.x, this.position.z, player.position.x, player.position.z);
  }

  private syncVisuals(active: boolean, elapsedSeconds: number): void {
    // Le modèle regarde vers +Z : conversion du cap mathématique vers la rotation Y de Three.js.
    this.head.rotation.y = Math.PI / 2 - this.heading;
    this.cone.visible = active;
    // Hors service : la LED clignote lentement en orange (IEM) ou s'éteint (pare-feu).
    if (this.firewalled) {
      this.ledMaterial.emissiveIntensity = 0;
    } else if (!active) {
      this.ledMaterial.emissive.setHex(0xffb020);
      this.ledMaterial.emissiveIntensity = Math.sin(elapsedSeconds * 6) > 0 ? 2 : 0.2;
    } else {
      this.ledMaterial.emissive.copy(CALM_COLOR).lerp(ALERT_COLOR, this.alarm);
      this.ledMaterial.emissiveIntensity = 2.5;
    }
    if (!active) return;
    for (let segment = 0; segment <= CONE_SEGMENTS; segment++) {
      const angle = this.heading - FIELD_OF_VIEW / 2 + (FIELD_OF_VIEW * segment) / CONE_SEGMENTS;
      const reach = castRay(this.grid, this.position.x, this.position.z, angle, VISION_RANGE);
      const offset = (segment + 1) * 3;
      this.conePositions[offset] = Math.cos(angle) * reach;
      this.conePositions[offset + 2] = Math.sin(angle) * reach;
    }
    (this.cone.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    this.cone.geometry.computeBoundingSphere();
    this.cone.position.set(this.position.x, 0.045, this.position.z);
    this.cone.material.color.copy(CALM_COLOR).lerp(ALERT_COLOR, this.alarm);
    this.cone.material.opacity = 0.3 + this.alarm * 0.45;
  }
}

function createCameraModel(): { mount: THREE.Group; head: THREE.Group; led: THREE.MeshStandardMaterial } {
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b333b, metalness: 0.7, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c1014, metalness: 0.4, roughness: 0.5 });
  const led = new THREE.MeshStandardMaterial({ color: 0xb388ff, emissive: 0xb388ff, emissiveIntensity: 2.5 });
  const mount = new THREE.Group();
  const head = new THREE.Group();
  const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), metal);
  bracket.position.y = 0.12;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.42), metal);
  body.position.z = 0.12;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 14), dark);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.35;
  const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), led);
  ledMesh.position.set(0.07, 0.07, 0.3);
  head.add(body, lens, ledMesh);
  // Lacet puis inclinaison dans le repère de la tête : la caméra pivote et regarde vers le sol.
  head.rotation.order = "YXZ";
  head.rotation.x = 0.35;
  mount.add(bracket, head);
  mount.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = true;
  });
  return { mount, head, led };
}

function createCone(): { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; positions: Float32Array } {
  const vertexCount = CONE_SEGMENTS + 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 4);
  for (let vertex = 0; vertex < vertexCount; vertex++) colors.set([1, 1, 1, vertex === 0 ? 1 : 0.1], vertex * 4);
  const indices: number[] = [];
  for (let segment = 1; segment <= CONE_SEGMENTS; segment++) indices.push(0, segment + 1, segment);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color: CALM_COLOR,
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return { mesh: new THREE.Mesh(geometry, material), positions };
}
