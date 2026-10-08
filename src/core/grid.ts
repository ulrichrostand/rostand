export enum Tile {
  Wall = 0,
  Floor = 1,
  /** Caisse / rack serveur : bloque le passage ET la ligne de vue (couverture). */
  Cover = 2,
}

export interface Cell {
  x: number;
  z: number;
}

export class Grid {
  readonly tiles: Tile[];

  constructor(
    readonly width: number,
    readonly height: number,
    fill: Tile = Tile.Wall,
  ) {
    this.tiles = new Array<Tile>(width * height).fill(fill);
  }

  inBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.width && z < this.height;
  }

  get(x: number, z: number): Tile {
    // Hors carte = mur : évite toute fuite du joueur ou des rayons hors du niveau.
    if (!this.inBounds(x, z)) return Tile.Wall;
    return this.tiles[z * this.width + x] as Tile;
  }

  set(x: number, z: number, tile: Tile): void {
    if (!this.inBounds(x, z)) throw new RangeError(`set(): (${x}, ${z}) hors de la grille`);
    this.tiles[z * this.width + x] = tile;
  }

  isWalkable(x: number, z: number): boolean {
    return this.get(x, z) === Tile.Floor;
  }

  blocksSight(x: number, z: number): boolean {
    return this.get(x, z) !== Tile.Floor;
  }
}

const NEIGHBOR_OFFSETS: readonly Cell[] = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
];

/**
 * Plus court chemin BFS (4-connexité), O(largeur × hauteur).
 * Les cartes font < 2 000 cases : un A* n'apporterait rien de mesurable.
 */
export function findPath(grid: Grid, from: Cell, to: Cell): Cell[] | null {
  if (!grid.isWalkable(from.x, from.z) || !grid.isWalkable(to.x, to.z)) return null;
  const toKey = (cell: Cell): number => cell.z * grid.width + cell.x;
  const cameFrom = new Map<number, number>([[toKey(from), -1]]);
  const queue: Cell[] = [from];
  const targetKey = toKey(to);

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as Cell;
    if (toKey(current) === targetKey) return rebuildPath(cameFrom, targetKey, grid.width);
    for (const offset of NEIGHBOR_OFFSETS) {
      const next = { x: current.x + offset.x, z: current.z + offset.z };
      const nextKey = toKey(next);
      if (!grid.isWalkable(next.x, next.z) || cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, toKey(current));
      queue.push(next);
    }
  }
  return null;
}

function rebuildPath(cameFrom: Map<number, number>, targetKey: number, width: number): Cell[] {
  const path: Cell[] = [];
  for (let key = targetKey; key !== -1; key = cameFrom.get(key) ?? -1) {
    path.push({ x: key % width, z: Math.floor(key / width) });
  }
  return path.reverse();
}

/** Toutes les cases accessibles depuis `origin` (flood fill). */
export function reachableCells(grid: Grid, origin: Cell): Set<number> {
  const visited = new Set<number>();
  if (!grid.isWalkable(origin.x, origin.z)) return visited;
  const queue: Cell[] = [origin];
  visited.add(origin.z * grid.width + origin.x);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as Cell;
    for (const offset of NEIGHBOR_OFFSETS) {
      const next = { x: current.x + offset.x, z: current.z + offset.z };
      const key = next.z * grid.width + next.x;
      if (!grid.isWalkable(next.x, next.z) || visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return visited;
}

/**
 * Ligne de vue entre deux points continus (en unités de case) par traversée DDA.
 * Coût O(distance) : appelé à chaque frame pour chaque garde, il doit rester linéaire.
 */
export function hasLineOfSight(
  grid: Grid,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): boolean {
  let cellX = Math.floor(fromX);
  let cellZ = Math.floor(fromZ);
  const endX = Math.floor(toX);
  const endZ = Math.floor(toZ);
  const deltaX = toX - fromX;
  const deltaZ = toZ - fromZ;
  const stepX = Math.sign(deltaX);
  const stepZ = Math.sign(deltaZ);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / deltaX) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / deltaZ) : Infinity;
  let tMaxX = stepX > 0 ? (cellX + 1 - fromX) * tDeltaX : stepX < 0 ? (fromX - cellX) * tDeltaX : Infinity;
  let tMaxZ = stepZ > 0 ? (cellZ + 1 - fromZ) * tDeltaZ : stepZ < 0 ? (fromZ - cellZ) * tDeltaZ : Infinity;

  // Garde-fou : borne le nombre d'itérations même si les flottants dérivent.
  const maxSteps = Math.abs(endX - cellX) + Math.abs(endZ - cellZ) + 2;
  for (let step = 0; step < maxSteps; step++) {
    if (cellX === endX && cellZ === endZ) return true;
    if (tMaxX < tMaxZ) {
      tMaxX += tDeltaX;
      cellX += stepX;
    } else {
      tMaxZ += tDeltaZ;
      cellZ += stepZ;
    }
    if (cellX === endX && cellZ === endZ) return true;
    if (grid.blocksSight(cellX, cellZ)) return false;
  }
  return true;
}

/**
 * Distance jusqu'au premier obstacle dans une direction (DDA), bornée par `maxDistance`.
 * Sert à découper les cônes de vision des gardes contre les murs.
 */
export function castRay(
  grid: Grid,
  originX: number,
  originZ: number,
  angle: number,
  maxDistance: number,
): number {
  const directionX = Math.cos(angle);
  const directionZ = Math.sin(angle);
  let cellX = Math.floor(originX);
  let cellZ = Math.floor(originZ);
  const stepX = Math.sign(directionX);
  const stepZ = Math.sign(directionZ);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / directionX) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / directionZ) : Infinity;
  let tMaxX = stepX > 0 ? (cellX + 1 - originX) * tDeltaX : stepX < 0 ? (originX - cellX) * tDeltaX : Infinity;
  let tMaxZ = stepZ > 0 ? (cellZ + 1 - originZ) * tDeltaZ : stepZ < 0 ? (originZ - cellZ) * tDeltaZ : Infinity;

  let travelled = 0;
  while (travelled < maxDistance) {
    if (tMaxX < tMaxZ) {
      travelled = tMaxX;
      tMaxX += tDeltaX;
      cellX += stepX;
    } else {
      travelled = tMaxZ;
      tMaxZ += tDeltaZ;
      cellZ += stepZ;
    }
    if (grid.blocksSight(cellX, cellZ)) return Math.min(travelled, maxDistance);
  }
  return maxDistance;
}
