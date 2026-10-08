import * as THREE from "three";
import { Tile, type Cell, type Grid } from "../core/grid";
import { SeededRandom } from "../core/rng";
import type { QualityProfile } from "../core/settings";
import type { LevelLayout, Room } from "./generator";
import { roomCenter } from "./generator";

export const WALL_HEIGHT = 1.8;
const COVER_HEIGHT = 1.15;
const LIGHT_FIXTURE_HEIGHT = 2.6;

export interface LevelVisualOptions {
  /** Couleur d'ambiance du secteur : chaque module a sa signature visuelle. */
  accent: THREE.Color;
  profile: QualityProfile;
  seed: number;
}

/** Éléments animés du décor (néons qui grésillent, LED, poussière). */
export interface LevelVisuals {
  update(elapsedSeconds: number): void;
}

export function cellToWorld(cell: Cell, height = 0): THREE.Vector3 {
  return new THREE.Vector3(cell.x + 0.5, height, cell.z + 0.5);
}

/** Teinte d'ambiance par module : on fait le tour du cercle chromatique au fil de la campagne. */
export function accentForModule(moduleIndex: number): THREE.Color {
  const hue = (0.36 + moduleIndex * 0.083) % 1;
  return new THREE.Color().setHSL(hue, 0.85, 0.55);
}

/** Construit le décor du niveau (sol, murs, racks, éclairage, ambiance) et renvoie ses animations. */
export function buildLevelScene(scene: THREE.Scene, layout: LevelLayout, options: LevelVisualOptions): LevelVisuals {
  const { grid } = layout;
  const random = new SeededRandom(options.seed ^ 0x5eed);
  const backgroundColor = new THREE.Color(0x04070b).lerp(options.accent, 0.04);
  scene.background = backgroundColor;
  scene.fog = new THREE.Fog(backgroundColor, 14, 34);

  scene.add(createFloor(grid));
  const wallCells = visibleWallCells(grid);
  scene.add(createWalls(wallCells, options.accent));
  const racks = createCoverRacks(grid, layout);
  scene.add(racks.mesh);
  scene.add(createFloorDetails(random, grid, layout, options.accent));
  for (const slot of layout.terminals) scene.add(createHazardDecal(slot.accessCell));
  const lights = addLighting(scene, random, layout, options);
  const dust = options.profile.dustParticles > 0 ? createDust(random, grid, options.profile.dustParticles) : null;
  if (dust) scene.add(dust);

  return {
    update(elapsedSeconds: number): void {
      racks.ledMaterial.emissiveIntensity = 0.9 + Math.sin(elapsedSeconds * 3.1) * 0.35;
      lights.update(elapsedSeconds);
      if (dust) {
        // Dérive lente de tout le nuage : l'illusion de particules en suspension sans coût par particule.
        dust.position.set(Math.sin(elapsedSeconds * 0.11) * 0.6, Math.sin(elapsedSeconds * 0.23) * 0.15, Math.cos(elapsedSeconds * 0.09) * 0.6);
      }
    },
  };
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponible : impossible de générer les textures");
  return { canvas, context };
}

function toTexture(canvas: HTMLCanvasElement, colorTexture: boolean): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Bruit léger pour casser l'aspect « aplat » des surfaces. */
function sprinkleNoise(context: CanvasRenderingContext2D, width: number, height: number, amount: number, seed: number): void {
  const random = new SeededRandom(seed);
  for (let index = 0; index < amount; index++) {
    const shade = random.int(0, 1) === 0 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.08)";
    context.fillStyle = shade;
    context.fillRect(random.int(0, width - 1), random.int(0, height - 1), random.int(1, 3), random.int(1, 3));
  }
}

function createFloor(grid: Grid): THREE.Mesh {
  const size = 128;
  const { canvas, context } = createCanvas(size, size);
  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#151c23");
  gradient.addColorStop(1, "#0f151b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  sprinkleNoise(context, size, size, 900, 7);
  // Joints de dalles en relief : une ligne sombre et une ligne claire décalée.
  context.strokeStyle = "#070a0d";
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, size - 3, size - 3);
  context.strokeStyle = "#26313b";
  context.lineWidth = 1;
  context.strokeRect(4, 4, size - 8, size - 8);
  context.fillStyle = "#2b3742";
  for (const [x, y] of [[10, 10], [118, 10], [10, 118], [118, 118]] as const) {
    context.beginPath();
    context.arc(x, y, 2.5, 0, Math.PI * 2);
    context.fill();
  }
  // Motif antidérapant discret au centre.
  context.strokeStyle = "rgba(255,255,255,0.035)";
  for (let offset = 30; offset < 100; offset += 8) {
    context.beginPath();
    context.moveTo(offset, 40);
    context.lineTo(offset + 6, 46);
    context.stroke();
  }
  const texture = toTexture(canvas, true);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(grid.width, grid.height);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(grid.width, grid.height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.55 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(grid.width / 2, 0, grid.height / 2);
  floor.receiveShadow = true;
  return floor;
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

function instancedAtCells(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  cells: Cell[],
  height: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(cells.length, 1));
  mesh.count = cells.length;
  const matrix = new THREE.Matrix4();
  cells.forEach((cell, index) => {
    matrix.setPosition(cell.x + 0.5, height, cell.z + 0.5);
    mesh.setMatrixAt(index, matrix);
  });
  return mesh;
}

/**
 * Murs en panneaux métalliques avec une bande lumineuse à la couleur du secteur.
 * La bande passe par emissiveMap : seule elle déclenche le bloom, le panneau reste sombre.
 */
function createWalls(wallCells: Cell[], accent: THREE.Color): THREE.InstancedMesh {
  const width = 128;
  const height = 230;
  const stripTop = 92;
  const stripHeight = 6;
  const base = createCanvas(width, height);
  base.context.fillStyle = "#2a3540";
  base.context.fillRect(0, 0, width, height);
  sprinkleNoise(base.context, width, height, 1200, 11);
  base.context.fillStyle = "#1c252e";
  base.context.fillRect(0, 0, width, 10);
  base.context.fillRect(0, height - 18, width, 18);
  base.context.strokeStyle = "#141b22";
  base.context.lineWidth = 2;
  base.context.strokeRect(6, 16, width - 12, stripTop - 22);
  base.context.strokeRect(6, stripTop + stripHeight + 8, width - 12, height - stripTop - stripHeight - 30);
  base.context.fillStyle = "#11171d";
  for (let slot = 0; slot < 5; slot++) base.context.fillRect(20 + slot * 18, height - 40, 10, 3);
  base.context.fillStyle = "#0b0f13";
  base.context.fillRect(0, stripTop - 2, width, stripHeight + 4);

  const glow = createCanvas(width, height);
  glow.context.fillStyle = "#000";
  glow.context.fillRect(0, 0, width, height);
  glow.context.fillStyle = "#fff";
  glow.context.fillRect(0, stripTop, width, stripHeight);
  glow.context.fillStyle = "#555";
  for (let slot = 0; slot < 5; slot++) glow.context.fillRect(20 + slot * 18, height - 40, 10, 3);

  const sideMaterial = new THREE.MeshStandardMaterial({
    map: toTexture(base.canvas, true),
    emissiveMap: toTexture(glow.canvas, false),
    emissive: accent.clone(),
    emissiveIntensity: 1.6,
    roughness: 0.65,
    metalness: 0.45,
  });
  // Le dessus des murs occupe beaucoup d'écran en vue plongeante : très sombre, avec juste un liseré coloré.
  const top = createCanvas(64, 64);
  top.context.fillStyle = "#0a0e12";
  top.context.fillRect(0, 0, 64, 64);
  sprinkleNoise(top.context, 64, 64, 120, 13);
  const topGlow = createCanvas(64, 64);
  topGlow.context.fillStyle = "#000";
  topGlow.context.fillRect(0, 0, 64, 64);
  topGlow.context.strokeStyle = "#3a3a3a";
  topGlow.context.lineWidth = 2;
  topGlow.context.strokeRect(1, 1, 62, 62);
  const topMaterial = new THREE.MeshStandardMaterial({
    map: toTexture(top.canvas, true),
    emissiveMap: toTexture(topGlow.canvas, false),
    emissive: accent.clone(),
    emissiveIntensity: 0.6,
    roughness: 0.9,
    metalness: 0.1,
  });
  // Ordre des faces d'une BoxGeometry : +X, -X, +Y (dessus), -Y, +Z, -Z.
  const materials = [sideMaterial, sideMaterial, topMaterial, topMaterial, sideMaterial, sideMaterial];
  const walls = instancedAtCells(new THREE.BoxGeometry(1, WALL_HEIGHT, 1), materials, wallCells, WALL_HEIGHT / 2);
  walls.castShadow = true;
  walls.receiveShadow = true;
  return walls;
}

/** Racks serveurs : couverture qui bloque la vue des sentinelles, avec LED qui pulsent. */
function createCoverRacks(grid: Grid, layout: LevelLayout): { mesh: THREE.InstancedMesh; ledMaterial: THREE.MeshStandardMaterial } {
  const terminalKeys = new Set(layout.terminals.map((slot) => `${slot.cell.x},${slot.cell.z}`));
  const rackCells: Cell[] = [];
  for (let z = 0; z < grid.height; z++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.get(x, z) === Tile.Cover && !terminalKeys.has(`${x},${z}`)) rackCells.push({ x, z });
    }
  }
  const width = 64;
  const height = 96;
  const base = createCanvas(width, height);
  const glow = createCanvas(width, height);
  base.context.fillStyle = "#161c23";
  base.context.fillRect(0, 0, width, height);
  glow.context.fillStyle = "#000";
  glow.context.fillRect(0, 0, width, height);
  const random = new SeededRandom(23);
  for (let row = 0; row < 9; row++) {
    const y = 4 + row * 10;
    base.context.fillStyle = "#0b0f13";
    base.context.fillRect(4, y, 56, 8);
    base.context.fillStyle = "#222b34";
    base.context.fillRect(6, y + 2, 30, 1);
    for (let led = 0; led < 3; led++) {
      const color = random.pick(["#39ff88", "#2bb3ff", "#39ff88", "#ffb020"]);
      base.context.fillStyle = color;
      glow.context.fillStyle = color;
      base.context.fillRect(44 + led * 5, y + 3, 2, 2);
      glow.context.fillRect(44 + led * 5, y + 3, 2, 2);
    }
  }
  const ledMaterial = new THREE.MeshStandardMaterial({
    map: toTexture(base.canvas, true),
    emissiveMap: toTexture(glow.canvas, true),
    emissive: 0xffffff,
    emissiveIntensity: 1,
    roughness: 0.5,
    metalness: 0.6,
  });
  const topMaterial = new THREE.MeshStandardMaterial({ color: 0x10161b, roughness: 0.7, metalness: 0.5 });
  const materials = [ledMaterial, ledMaterial, topMaterial, topMaterial, ledMaterial, ledMaterial];
  const mesh = instancedAtCells(new THREE.BoxGeometry(0.9, COVER_HEIGHT, 0.9), materials, rackCells, COVER_HEIGHT / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, ledMaterial };
}

/** Câbles au sol le long des murs et grilles d'aération lumineuses : le complexe a l'air habité. */
function createFloorDetails(random: SeededRandom, grid: Grid, layout: LevelLayout, accent: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  const reserved = new Set([layout.start, layout.exit, ...layout.intel, ...layout.terminals.map((slot) => slot.accessCell)].map((cell) => `${cell.x},${cell.z}`));
  const cableCells: { cell: Cell; horizontal: boolean }[] = [];
  const ventCells: Cell[] = [];
  for (let z = 1; z < grid.height - 1; z++) {
    for (let x = 1; x < grid.width - 1; x++) {
      if (!grid.isWalkable(x, z) || reserved.has(`${x},${z}`)) continue;
      const wallNorth = grid.get(x, z - 1) === Tile.Wall;
      const wallWest = grid.get(x - 1, z) === Tile.Wall;
      if ((wallNorth || wallWest) && random.next() < 0.22) cableCells.push({ cell: { x, z }, horizontal: wallNorth });
      else if (random.next() < 0.015) ventCells.push({ x, z });
    }
  }

  const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.4, metalness: 0.2 });
  const cables = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), cableMaterial, Math.max(cableCells.length * 2, 1));
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  let cableIndex = 0;
  for (const { cell, horizontal } of cableCells) {
    for (let strand = 0; strand < 2; strand++) {
      const offset = 0.12 + strand * 0.09;
      const position = horizontal
        ? new THREE.Vector3(cell.x + 0.5, 0.035, cell.z + offset)
        : new THREE.Vector3(cell.x + offset, 0.035, cell.z + 0.5);
      rotation.setFromEuler(new THREE.Euler(horizontal ? 0 : Math.PI / 2, 0, horizontal ? Math.PI / 2 : 0));
      matrix.compose(position, rotation, new THREE.Vector3(1, 1, 1));
      cables.setMatrixAt(cableIndex++, matrix);
    }
  }
  cables.count = cableIndex;
  cables.receiveShadow = true;
  group.add(cables);

  const vent = createCanvas(64, 64);
  vent.context.fillStyle = "#000";
  vent.context.fillRect(0, 0, 64, 64);
  vent.context.fillStyle = "#fff";
  for (let bar = 0; bar < 6; bar++) vent.context.fillRect(10, 10 + bar * 8, 44, 3);
  const ventMaterial = new THREE.MeshBasicMaterial({
    map: toTexture(vent.canvas, false),
    color: accent.clone().multiplyScalar(0.9),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const vents = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 0.7), ventMaterial, Math.max(ventCells.length, 1));
  rotation.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  ventCells.forEach((cell, index) => {
    matrix.compose(new THREE.Vector3(cell.x + 0.5, 0.012, cell.z + 0.5), rotation, new THREE.Vector3(1, 1, 1));
    vents.setMatrixAt(index, matrix);
  });
  vents.count = ventCells.length;
  group.add(vents);
  return group;
}

/** Bandes de danger devant chaque terminal : on repère d'un coup d'œil où pirater. */
function createHazardDecal(cell: Cell): THREE.Mesh {
  const { canvas, context } = createCanvas(64, 64);
  context.fillStyle = "#14110a";
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = "#e0a91c";
  for (let stripe = -64; stripe < 64; stripe += 16) {
    context.beginPath();
    context.moveTo(stripe, 64);
    context.lineTo(stripe + 8, 64);
    context.lineTo(stripe + 72, 0);
    context.lineTo(stripe + 64, 0);
    context.fill();
  }
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshStandardMaterial({ map: toTexture(canvas, true), roughness: 0.8, transparent: true, opacity: 0.55 }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.copy(cellToWorld(cell, 0.006));
  decal.receiveShadow = true;
  return decal;
}

function radialGradientTexture(innerAlpha: number): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(128, 128);
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, `rgba(255,255,255,${innerAlpha})`);
  gradient.addColorStop(0.45, `rgba(255,255,255,${innerAlpha * 0.35})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return toTexture(canvas, false);
}

interface FlickeringLight {
  light: THREE.PointLight;
  fixture: THREE.MeshBasicMaterial;
  pool: THREE.MeshBasicMaterial;
  baseIntensity: number;
  flickers: boolean;
  phase: number;
}

/**
 * Éclairage : quelques néons de salle (plafonnés selon la qualité), chacun avec sa réglette visible,
 * une flaque de lumière au sol, et pour certains un grésillement. Le reste du complexe est dans l'ombre.
 */
function addLighting(
  scene: THREE.Scene,
  random: SeededRandom,
  layout: LevelLayout,
  options: LevelVisualOptions,
): { update(elapsedSeconds: number): void } {
  scene.add(new THREE.HemisphereLight(0x6f8cab, 0x0d1217, 0.6));
  const moonlight = new THREE.DirectionalLight(0x8fb4ff, 0.35);
  moonlight.position.set(10, 20, 6);
  scene.add(moonlight);

  const poolTexture = radialGradientTexture(0.55);
  const fixtureGeometry = new THREE.BoxGeometry(1.4, 0.06, 0.18);
  const poolGeometry = new THREE.PlaneGeometry(6, 6);
  const warm = new THREE.Color(0xffb46b);
  const lit: FlickeringLight[] = [];
  const litRooms = random
    .shuffle(layout.rooms.filter((room) => room !== layout.rooms[0]))
    .slice(0, Math.max(0, options.profile.roomLights - 1));
  // La salle de départ est toujours éclairée : premier contact rassurant pour le joueur.
  const rooms: Room[] = [layout.rooms[0] as Room, ...litRooms];

  rooms.forEach((room, index) => {
    const color = index % 3 === 2 ? warm.clone() : options.accent.clone().lerp(new THREE.Color(0xffffff), 0.35);
    // Réglette décalée vers le fond de la salle : vue de la caméra, elle ne masque jamais un personnage au centre.
    const center = cellToWorld(roomCenter(room)).add(new THREE.Vector3(0, 0, -Math.min(1.5, room.height / 2 - 1)));
    const light = new THREE.PointLight(color, 9, 10, 1.6);
    light.position.set(center.x, LIGHT_FIXTURE_HEIGHT - 0.2, center.z);
    scene.add(light);

    const fixtureMaterial = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.6) });
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
    fixture.position.set(center.x, LIGHT_FIXTURE_HEIGHT, center.z);
    scene.add(fixture);

    const poolMaterial = new THREE.MeshBasicMaterial({
      map: poolTexture,
      color,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pool = new THREE.Mesh(poolGeometry, poolMaterial);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(center.x, 0.01, center.z);
    scene.add(pool);

    lit.push({ light, fixture: fixtureMaterial, pool: poolMaterial, baseIntensity: 9, flickers: index > 0 && random.next() < 0.35, phase: random.next() * 10 });
  });

  return {
    update(elapsedSeconds: number): void {
      for (const entry of lit) {
        if (!entry.flickers) continue;
        // Néon fatigué : quelques coupures brèves et irrégulières, pas un clignotement régulier.
        const signal = Math.sin(elapsedSeconds * 13 + entry.phase) * Math.sin(elapsedSeconds * 7.3 + entry.phase * 2);
        const level = signal > 0.82 ? 0.15 : 1;
        entry.light.intensity = entry.baseIntensity * level;
        entry.fixture.color.copy(entry.light.color).multiplyScalar(1.6 * level);
        entry.pool.opacity = 0.22 * level;
      }
    },
  };
}

function createDust(random: SeededRandom, grid: Grid, count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  let placed = 0;
  for (let attempt = 0; placed < count && attempt < count * 10; attempt++) {
    const x = random.next() * grid.width;
    const z = random.next() * grid.height;
    if (!grid.isWalkable(Math.floor(x), Math.floor(z))) continue;
    positions[placed * 3] = x;
    positions[placed * 3 + 1] = 0.2 + random.next() * 2.2;
    positions[placed * 3 + 2] = z;
    placed++;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions.subarray(0, placed * 3), 3));
  const material = new THREE.PointsMaterial({
    map: radialGradientTexture(1),
    color: 0xbcd6e8,
    size: 0.07,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

/** Libère la mémoire GPU : indispensable quand on enchaîne les missions sans recharger la page. */
export function disposeScene(scene: THREE.Scene): void {
  const disposedMaterials = new Set<THREE.Material>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      // Les murs partagent un même matériau sur plusieurs faces : on ne le libère qu'une fois.
      if (disposedMaterials.has(material)) continue;
      disposedMaterials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
  scene.clear();
}
