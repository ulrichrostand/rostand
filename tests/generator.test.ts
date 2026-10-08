import { describe, expect, it } from "vitest";
import { findPath, hasLineOfSight, Grid, Tile } from "../src/core/grid";
import { generateLevel } from "../src/level/generator";

describe("generateLevel", () => {
  const seeds = Array.from({ length: 40 }, (_, index) => 1000 + index * 37);

  it.each(seeds)("produit un niveau jouable (graine %i)", (seed) => {
    const layout = generateLevel({ seed, terminalCount: 5, guardCount: 4 });
    expect(layout.terminals).toHaveLength(5);
    expect(layout.guards).toHaveLength(4);
    expect(findPath(layout.grid, layout.start, layout.exit)).not.toBeNull();
    for (const terminal of layout.terminals) {
      expect(layout.grid.get(terminal.cell.x, terminal.cell.z)).toBe(Tile.Cover);
      expect(findPath(layout.grid, layout.start, terminal.accessCell)).not.toBeNull();
    }
  });

  it("est déterministe pour une même graine", () => {
    const first = generateLevel({ seed: 42, terminalCount: 5, guardCount: 3 });
    const second = generateLevel({ seed: 42, terminalCount: 5, guardCount: 3 });
    expect(first.grid.tiles).toEqual(second.grid.tiles);
    expect(first.guards).toEqual(second.guards);
  });
});

describe("hasLineOfSight", () => {
  it("est bloquée par un mur", () => {
    const grid = new Grid(10, 3, Tile.Floor);
    expect(hasLineOfSight(grid, 0.5, 1.5, 9.5, 1.5)).toBe(true);
    grid.set(5, 1, Tile.Wall);
    expect(hasLineOfSight(grid, 0.5, 1.5, 9.5, 1.5)).toBe(false);
  });
});

import { CURRICULUM } from "../src/content/curriculum";
import { seedFromString } from "../src/core/rng";
import { difficultyForModule } from "../src/game/difficulty";

describe("niveaux de la campagne", () => {
  it.each(CURRICULUM.map((module, index) => [module.id, index] as const))("le module %s génère un niveau valide", (id, index) => {
    const difficulty = difficultyForModule(index);
    const module = CURRICULUM[index]!;
    const layout = generateLevel({
      seed: seedFromString(id),
      terminalCount: module.challenges.length,
      guardCount: difficulty.guardCount,
      width: difficulty.mapWidth,
      height: difficulty.mapHeight,
    });
    expect(layout.terminals).toHaveLength(module.challenges.length);
    expect(layout.guards).toHaveLength(difficulty.guardCount);
  });
});
