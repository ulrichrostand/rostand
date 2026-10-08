import * as THREE from "three";
import type { TerminalSlot } from "../level/generator";
import { cellToWorld } from "../level/levelScene";

const LOCKED_COLOR = 0xff3b4e;
const HACKED_COLOR = 0x39ff88;

export class HackTerminal {
  readonly root = new THREE.Group();
  readonly interactionPoint: THREE.Vector3;
  hacked = false;
  private readonly screenMaterial: THREE.MeshStandardMaterial;
  private readonly marker: THREE.Mesh;

  constructor(
    readonly slot: TerminalSlot,
    readonly label: string,
  ) {
    this.root.position.copy(cellToWorld(slot.cell));
    this.interactionPoint = cellToWorld(slot.accessCell);
    // L'écran fait face à la case d'accès, d'où le joueur pirate le terminal.
    this.root.rotation.y = slot.accessCell.z > slot.cell.z ? 0 : Math.PI;

    const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x232b33, metalness: 0.6, roughness: 0.4 });
    const console3d = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), caseMaterial);
    console3d.position.y = 0.52;
    this.screenMaterial = new THREE.MeshStandardMaterial({ color: LOCKED_COLOR, emissive: LOCKED_COLOR, emissiveIntensity: 1.4 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.4), this.screenMaterial);
    screen.position.set(0, 0.78, 0.281);
    this.marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16),
      new THREE.MeshStandardMaterial({ color: LOCKED_COLOR, emissive: LOCKED_COLOR, emissiveIntensity: 2 }),
    );
    this.marker.position.y = 1.6;
    this.root.add(console3d, screen, this.marker);
  }

  markHacked(): void {
    this.hacked = true;
    this.screenMaterial.color.setHex(HACKED_COLOR);
    this.screenMaterial.emissive.setHex(HACKED_COLOR);
    this.marker.visible = false;
  }

  update(elapsedSeconds: number): void {
    if (this.hacked) return;
    this.marker.rotation.y = elapsedSeconds * 2;
    this.marker.position.y = 1.6 + Math.sin(elapsedSeconds * 3) * 0.08;
  }
}

export class ExtractionZone {
  readonly root = new THREE.Group();
  unlocked = false;
  private readonly ringMaterial = new THREE.MeshBasicMaterial({
    color: LOCKED_COLOR,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  private readonly beam: THREE.Mesh;

  constructor(readonly position: THREE.Vector3) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 32), this.ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 3, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: HACKED_COLOR, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.beam.position.y = 1.5;
    this.beam.visible = false;
    this.root.position.copy(position);
    this.root.add(ring, this.beam);
  }

  unlock(): void {
    this.unlocked = true;
    this.ringMaterial.color.setHex(HACKED_COLOR);
    this.beam.visible = true;
  }

  update(elapsedSeconds: number): void {
    this.ringMaterial.opacity = 0.45 + Math.sin(elapsedSeconds * 4) * 0.2;
  }
}
