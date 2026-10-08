import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { Grid, Tile } from "../src/core/grid";
import { Guard, type GuardTuning, type PlayerSnapshot } from "../src/entities/guard";

const TUNING: GuardTuning = { walkSpeed: 0, visionRange: 6, fieldOfViewRadians: Math.PI / 2, detectionRate: 1 };

/** Couloir horizontal : le garde regarde vers +X depuis la case (1, 1). */
function createCorridor(): Grid {
  const grid = new Grid(14, 3, Tile.Wall);
  for (let x = 1; x < 13; x++) grid.set(x, 1, Tile.Floor);
  return grid;
}

function simulate(guard: Guard, player: PlayerSnapshot | null, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) guard.update(1 / 60, player);
}

function playerAt(x: number, posture: PlayerSnapshot["posture"] = "standing"): PlayerSnapshot {
  return { position: new THREE.Vector3(x + 0.5, 0, 1.5), posture, isMoving: false };
}

describe("Guard", () => {
  const route = { waypoints: [{ x: 1, z: 1 }, { x: 2, z: 1 }] };

  it("détecte un joueur debout dans son champ de vision", () => {
    const guard = new Guard(createCorridor(), route, TUNING);
    simulate(guard, playerAt(4), 2);
    expect(guard.awareness).toBe(1);
  });

  it("ne voit pas un joueur accroupi hors de la portée réduite", () => {
    const guard = new Guard(createCorridor(), route, TUNING);
    simulate(guard, playerAt(6, "crouching"), 2);
    expect(guard.awareness).toBe(0);
  });

  it("ne voit pas à travers un rack serveur", () => {
    const grid = createCorridor();
    grid.set(3, 1, Tile.Cover);
    const guard = new Guard(grid, route, TUNING);
    simulate(guard, playerAt(5), 2);
    expect(guard.awareness).toBe(0);
  });

  it("ignore le joueur pendant l'invulnérabilité de réapparition", () => {
    const guard = new Guard(createCorridor(), route, TUNING);
    simulate(guard, null, 2);
    expect(guard.awareness).toBe(0);
  });
});
