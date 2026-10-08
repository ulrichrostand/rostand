import { Grid, Tile, findPath, reachableCells, type Cell } from "../core/grid";
import { SeededRandom } from "../core/rng";

export interface Room {
  x: number;
  z: number;
  width: number;
  height: number;
}

export interface TerminalSlot {
  cell: Cell;
  /** Case libre adjacente depuis laquelle le joueur pirate le terminal. */
  accessCell: Cell;
}

export interface GuardRoute {
  /** Chemin parcouru en aller-retour (ping-pong). */
  waypoints: Cell[];
}

export interface LevelLayout {
  grid: Grid;
  rooms: Room[];
  start: Cell;
  exit: Cell;
  terminals: TerminalSlot[];
  guards: GuardRoute[];
}

export interface GeneratorOptions {
  seed: number;
  terminalCount: number;
  guardCount: number;
  width?: number;
  height?: number;
}

interface Rect {
  x: number;
  z: number;
  width: number;
  height: number;
}

const MIN_LEAF_SIZE = 9;
const CORRIDOR_WIDTH = 2;
const MAX_GENERATION_ATTEMPTS = 25;

/**
 * Génère un complexe de salles reliées par des couloirs (BSP).
 * Réessaie avec une graine dérivée si une contrainte n'est pas satisfaite :
 * un niveau injouable ne doit jamais atteindre le joueur.
 */
export function generateLevel(options: GeneratorOptions): LevelLayout {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const layout = tryGenerate(options, options.seed + attempt * 7919);
    if (layout) return layout;
  }
  throw new Error(
    `Impossible de générer un niveau valide (graine ${options.seed}, ${options.terminalCount} terminaux)`,
  );
}

function tryGenerate(options: GeneratorOptions, seed: number): LevelLayout | null {
  const random = new SeededRandom(seed);
  const width = options.width ?? 41;
  const height = options.height ?? 31;
  const grid = new Grid(width, height, Tile.Wall);

  const leaves = splitSpace(random, { x: 1, z: 1, width: width - 2, height: height - 2 });
  const rooms = leaves.map((leaf) => carveRoom(random, grid, leaf));
  // Ordonner les salles en serpentin assure un graphe connexe avec des couloirs courts.
  for (let index = 1; index < rooms.length; index++) {
    carveCorridor(random, grid, roomCenter(rooms[index - 1] as Room), roomCenter(rooms[index] as Room));
  }
  // Une boucle supplémentaire offre des routes alternatives pour contourner les gardes.
  if (rooms.length > 3) {
    carveCorridor(random, grid, roomCenter(rooms[0] as Room), roomCenter(rooms[Math.floor(rooms.length / 2)] as Room));
  }

  const startRoom = rooms[0] as Room;
  const start = roomCenter(startRoom);
  const exitRoom = farthestRoom(grid, start, rooms);
  if (!exitRoom || exitRoom === startRoom) return null;
  const exit = roomCenter(exitRoom);

  const candidateRooms = random.shuffle(rooms.filter((room) => room !== startRoom && room !== exitRoom));
  if (candidateRooms.length === 0) return null;

  const terminals: TerminalSlot[] = [];
  for (let index = 0; terminals.length < options.terminalCount && index < options.terminalCount * 6; index++) {
    const room = candidateRooms[index % candidateRooms.length] as Room;
    const slot = placeTerminal(random, grid, room, [start, exit]);
    if (slot) terminals.push(slot);
  }
  if (terminals.length < options.terminalCount) return null;

  scatterCover(random, grid, rooms, [start, exit, ...terminals.map((slot) => slot.accessCell)]);

  const guards = planGuardRoutes(random, grid, rooms, startRoom, options.guardCount);
  if (guards.length < options.guardCount) return null;

  return { grid, rooms, start, exit, terminals, guards };
}

function splitSpace(random: SeededRandom, root: Rect): Rect[] {
  const leaves: Rect[] = [];
  const stack: Rect[] = [root];
  while (stack.length > 0) {
    const rect = stack.pop() as Rect;
    const canSplitVertically = rect.width >= MIN_LEAF_SIZE * 2;
    const canSplitHorizontally = rect.height >= MIN_LEAF_SIZE * 2;
    if (!canSplitVertically && !canSplitHorizontally) {
      leaves.push(rect);
      continue;
    }
    const splitVertically =
      canSplitVertically && (!canSplitHorizontally || rect.width > rect.height || random.next() < 0.5);
    if (splitVertically) {
      const cut = random.int(MIN_LEAF_SIZE, rect.width - MIN_LEAF_SIZE);
      stack.push({ ...rect, width: cut }, { ...rect, x: rect.x + cut, width: rect.width - cut });
    } else {
      const cut = random.int(MIN_LEAF_SIZE, rect.height - MIN_LEAF_SIZE);
      stack.push({ ...rect, height: cut }, { ...rect, z: rect.z + cut, height: rect.height - cut });
    }
  }
  // Tri en serpentin (lignes alternées) pour relier des salles voisines entre elles.
  return leaves.sort((first, second) => {
    const rowFirst = Math.floor(first.z / MIN_LEAF_SIZE);
    const rowSecond = Math.floor(second.z / MIN_LEAF_SIZE);
    if (rowFirst !== rowSecond) return rowFirst - rowSecond;
    return rowFirst % 2 === 0 ? first.x - second.x : second.x - first.x;
  });
}

function carveRoom(random: SeededRandom, grid: Grid, leaf: Rect): Room {
  const roomWidth = random.int(Math.max(5, leaf.width - 4), leaf.width - 1);
  const roomHeight = random.int(Math.max(5, leaf.height - 4), leaf.height - 1);
  const room: Room = {
    x: leaf.x + random.int(0, leaf.width - roomWidth - 1),
    z: leaf.z + random.int(0, leaf.height - roomHeight - 1),
    width: roomWidth,
    height: roomHeight,
  };
  for (let z = room.z; z < room.z + room.height; z++) {
    for (let x = room.x; x < room.x + room.width; x++) grid.set(x, z, Tile.Floor);
  }
  return room;
}

export function roomCenter(room: Room): Cell {
  return { x: room.x + Math.floor(room.width / 2), z: room.z + Math.floor(room.height / 2) };
}

function carveCorridor(random: SeededRandom, grid: Grid, from: Cell, to: Cell): void {
  const horizontalFirst = random.next() < 0.5;
  const corner = horizontalFirst ? { x: to.x, z: from.z } : { x: from.x, z: to.z };
  carveStraight(grid, from, corner);
  carveStraight(grid, corner, to);
}

function carveStraight(grid: Grid, from: Cell, to: Cell): void {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minZ = Math.min(from.z, to.z);
  const maxZ = Math.max(from.z, to.z);
  for (let z = minZ; z <= maxZ + CORRIDOR_WIDTH - 1; z++) {
    for (let x = minX; x <= maxX + CORRIDOR_WIDTH - 1; x++) {
      // On préserve la bordure extérieure : le niveau reste fermé.
      if (x > 0 && z > 0 && x < grid.width - 1 && z < grid.height - 1) grid.set(x, z, Tile.Floor);
    }
  }
}

function farthestRoom(grid: Grid, start: Cell, rooms: Room[]): Room | null {
  let best: Room | null = null;
  let bestDistance = -1;
  for (const room of rooms) {
    const path = findPath(grid, start, roomCenter(room));
    if (path && path.length > bestDistance) {
      bestDistance = path.length;
      best = room;
    }
  }
  return best;
}

/**
 * Pose un objet bloquant uniquement s'il ne coupe aucun passage :
 * on compare le nombre de cases accessibles avant/après.
 */
function tryBlockCell(grid: Grid, cell: Cell, origin: Cell, protectedCells: Cell[]): boolean {
  if (!grid.isWalkable(cell.x, cell.z)) return false;
  if (protectedCells.some((other) => Math.abs(other.x - cell.x) + Math.abs(other.z - cell.z) <= 1)) return false;
  const reachableBefore = reachableCells(grid, origin).size;
  grid.set(cell.x, cell.z, Tile.Cover);
  if (reachableCells(grid, origin).size !== reachableBefore - 1) {
    grid.set(cell.x, cell.z, Tile.Floor);
    return false;
  }
  return true;
}

function placeTerminal(random: SeededRandom, grid: Grid, room: Room, protectedCells: Cell[]): TerminalSlot | null {
  // Les terminaux sont adossés aux murs : lisible pour le joueur et ne bloque pas le centre.
  const candidates: TerminalSlot[] = [];
  for (let x = room.x; x < room.x + room.width; x++) {
    candidates.push({ cell: { x, z: room.z }, accessCell: { x, z: room.z + 1 } });
    candidates.push({ cell: { x, z: room.z + room.height - 1 }, accessCell: { x, z: room.z + room.height - 2 } });
  }
  for (const slot of random.shuffle(candidates)) {
    const isAgainstWall =
      grid.get(slot.cell.x, slot.cell.z - 1) === Tile.Wall || grid.get(slot.cell.x, slot.cell.z + 1) === Tile.Wall;
    if (!isAgainstWall || !grid.isWalkable(slot.accessCell.x, slot.accessCell.z)) continue;
    if (tryBlockCell(grid, slot.cell, protectedCells[0] as Cell, protectedCells)) return slot;
  }
  return null;
}

function scatterCover(random: SeededRandom, grid: Grid, rooms: Room[], protectedCells: Cell[]): void {
  const origin = protectedCells[0] as Cell;
  for (const room of rooms) {
    const crateCount = random.int(1, 3);
    for (let crate = 0; crate < crateCount; crate++) {
      const cell = {
        x: random.int(room.x + 1, room.x + room.width - 2),
        z: random.int(room.z + 1, room.z + room.height - 2),
      };
      tryBlockCell(grid, cell, origin, protectedCells);
    }
  }
}

function planGuardRoutes(
  random: SeededRandom,
  grid: Grid,
  rooms: Room[],
  startRoom: Room,
  guardCount: number,
): GuardRoute[] {
  const patrolRooms = rooms.filter((room) => room !== startRoom);
  const routes: GuardRoute[] = [];
  const isInStartRoom = (cell: Cell): boolean =>
    cell.x >= startRoom.x - 1 &&
    cell.x <= startRoom.x + startRoom.width &&
    cell.z >= startRoom.z - 1 &&
    cell.z <= startRoom.z + startRoom.height;

  for (let attempt = 0; routes.length < guardCount && attempt < guardCount * 20; attempt++) {
    const from = randomFloorCell(random, grid, random.pick(patrolRooms));
    const to = randomFloorCell(random, grid, random.pick(patrolRooms));
    if (!from || !to) continue;
    const path = findPath(grid, from, to);
    // Une ronde trop courte = garde statique ; une ronde qui traverse le spawn = détection immédiate.
    if (!path || path.length < 6 || path.some(isInStartRoom)) continue;
    routes.push({ waypoints: path });
  }
  return routes;
}

function randomFloorCell(random: SeededRandom, grid: Grid, room: Room): Cell | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    const cell = {
      x: random.int(room.x, room.x + room.width - 1),
      z: random.int(room.z, room.z + room.height - 1),
    };
    if (grid.isWalkable(cell.x, cell.z)) return cell;
  }
  return null;
}
