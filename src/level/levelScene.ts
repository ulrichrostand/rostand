import * as THREE from "three";
import { Tile, type Cell, type Grid } from "../core/grid";
import type { LevelLayout } from "./generator";
import { roomCenter } from "./generator";

export const WALL_HEIGHT = 1.8;
const COVER_HEIGHT = 1.15;
/** Au-delà, chaque PointLight alourdit tous les shaders : on plafonne pour garder 60 FPS. */
const MAX_ROOM_LIGHTS = 6;

export function cellToWorld(cell: Cell, height = 0): THREE.Vector3 {
  return new THREE.Vector3(cell.x + 0.5, height, cell.z + 0.5);
}

/** Construit la géométrie statique du niveau (sol, murs, racks, éclairage d'ambiance). */
export function buildLevelScene(scene: THREE.Scene, layout: LevelLayout): void {
  const { grid } = layout;
  scene.background = new THREE.Color(0x05080c);
  scene.fog = new THREE.Fog(0x05080c, 14, 34);

  scene.add(createFloor(grid));
  const wallCells = visibleWallCells(grid);
  scene.add(createWalls(wallCells), createWallCaps(wallCells));
  scene.add(createCoverRacks(grid, layout));
  addLighting(scene, layout);
}

function createFloor(grid: Grid): THREE.Mesh {
  const texture = createFloorTexture();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(grid.width, grid.height);
  texture.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(grid.width, grid.height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.2 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(grid.width / 2, 0, grid.height / 2);
  return floor;
}

function createFloorTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponible : impossible de générer les textures");
  context.fillStyle = "#11171d";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "#1f2b35";
  context.lineWidth = 2;
  context.strokeRect(1, 1, size - 2, size - 2);
  context.fillStyle = "#18222b";
  for (const [x, y] of [[8, 8], [56, 8], [8, 56], [56, 56]] as const) context.fillRect(x - 2, y - 2, 4, 4);
  return new THREE.CanvasTexture(canvas);
}

function isBoundaryWall(grid: Grid, x: number, z: number): boolean {
  if (grid.get(x, z) !== Tile.Wall) return false;
  for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      if (grid.get(x + offsetX, z + offsetZ) !== Tile.Wall) return true;
    }
  }
  return false;
}

function visibleWallCells(grid: Grid): Cell[] {
  const wallCells: Cell[] = [];
  for (let z = 0; z < grid.height; z++) {
    for (let x = 0; x < grid.width; x++) if (isBoundaryWall(grid, x, z)) wallCells.push({ x, z });
  }
  return wallCells;
}

function instancedAtCells(geometry: THREE.BufferGeometry, material: THREE.Material, cells: Cell[], height: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(cells.length, 1));
  mesh.count = cells.length;
  const matrix = new THREE.Matrix4();
  cells.forEach((cell, index) => {
    matrix.setPosition(cell.x + 0.5, height, cell.z + 0.5);
    mesh.setMatrixAt(index, matrix);
  });
  return mesh;
}

/** Seuls les murs visibles (adjacents au sol) sont instanciés : ~4x moins de géométrie. */
function createWalls(wallCells: Cell[]): THREE.InstancedMesh {
  const material = new THREE.MeshStandardMaterial({ color: 0x3a4a57, emissive: 0x0b151d, roughness: 0.7, metalness: 0.3 });
  return instancedAtCells(new THREE.BoxGeometry(1, WALL_HEIGHT, 1), material, wallCells, WALL_HEIGHT / 2);
}

/** Liseré lumineux au sommet des murs : vue du dessus, le plan du complexe reste lisible. */
function createWallCaps(wallCells: Cell[]): THREE.InstancedMesh {
  const material = new THREE.MeshBasicMaterial({ color: 0x173842 });
  return instancedAtCells(new THREE.BoxGeometry(1.001, 0.04, 1.001), material, wallCells, WALL_HEIGHT + 0.02);
}

function createRackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponible : impossible de générer les textures");
  context.fillStyle = "#1a2129";
  context.fillRect(0, 0, 64, 64);
  for (let row = 0; row < 6; row++) {
    context.fillStyle = "#0d1217";
    context.fillRect(4, 4 + row * 10, 56, 7);
    context.fillStyle = row % 2 === 0 ? "#39ff88" : "#2bb3ff";
    context.fillRect(50, 6 + row * 10, 3, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Racks serveurs : couverture qui bloque la vue des gardes. */
function createCoverRacks(grid: Grid, layout: LevelLayout): THREE.InstancedMesh {
  const terminalKeys = new Set(layout.terminals.map((slot) => `${slot.cell.x},${slot.cell.z}`));
  const rackCells: Cell[] = [];
  for (let z = 0; z < grid.height; z++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.get(x, z) === Tile.Cover && !terminalKeys.has(`${x},${z}`)) rackCells.push({ x, z });
    }
  }
  const rackTexture = createRackTexture();
  const material = new THREE.MeshStandardMaterial({ map: rackTexture, emissiveMap: rackTexture, emissive: 0xffffff, emissiveIntensity: 0.35 });
  return instancedAtCells(new THREE.BoxGeometry(0.9, COVER_HEIGHT, 0.9), material, rackCells, COVER_HEIGHT / 2);
}

function addLighting(scene: THREE.Scene, layout: LevelLayout): void {
  scene.add(new THREE.HemisphereLight(0x7f9fc0, 0x10161c, 0.9));
  const moonlight = new THREE.DirectionalLight(0x8fb4ff, 0.45);
  moonlight.position.set(10, 20, 6);
  scene.add(moonlight);

  // Néons de salle : une lumière froide sur une partie des salles, pour créer des zones d'ombre.
  layout.rooms
    .filter((_, index) => index % 2 === 0)
    .slice(0, MAX_ROOM_LIGHTS)
    .forEach((room) => {
      const light = new THREE.PointLight(0x4fc3ff, 7, 9, 1.6);
      light.position.copy(cellToWorld(roomCenter(room), 2));
      scene.add(light);
    });
}

/** Libère la mémoire GPU : indispensable quand on enchaîne les missions sans recharger la page. */
export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
  scene.clear();
}
