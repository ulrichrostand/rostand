import * as THREE from "three";
import type { Cell } from "../core/grid";
import { cellToWorld } from "../level/levelScene";

const INTEL_COLOR = 0xffc83d;

/** Dossier classifié posé au sol : il contient une leçon. Lumineux pour être repérable de loin. */
export class IntelPickup {
  readonly root = new THREE.Group();
  readonly position: THREE.Vector3;
  collected = false;
  private readonly folder: THREE.Group;
  private readonly halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

  constructor(readonly cell: Cell) {
    this.position = cellToWorld(cell);
    this.root.position.copy(this.position);
    this.folder = createFolderModel();
    this.halo = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.42, 24),
      new THREE.MeshBasicMaterial({ color: INTEL_COLOR, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.halo.rotation.x = -Math.PI / 2;
    this.halo.position.y = 0.02;
    this.root.add(this.folder, this.halo);
  }

  collect(): void {
    this.collected = true;
    this.root.visible = false;
  }

  update(elapsedSeconds: number): void {
    if (this.collected) return;
    this.folder.rotation.y = elapsedSeconds * 1.5;
    this.folder.position.y = 0.55 + Math.sin(elapsedSeconds * 2.5) * 0.08;
    this.halo.material.opacity = 0.35 + Math.sin(elapsedSeconds * 3) * 0.15;
  }
}

function createFolderModel(): THREE.Group {
  const group = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ color: INTEL_COLOR, emissive: INTEL_COLOR, emissiveIntensity: 0.9 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf2f2e6, emissive: 0x555544 });
  const folder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.32), cover);
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.28), paper);
  sheet.position.y = 0.03;
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), cover);
  tab.position.set(-0.11, 0, -0.18);
  group.add(folder, sheet, tab);
  // Incliné vers la caméra pour être lisible en vue de dessus.
  group.rotation.x = -0.5;
  return group;
}
