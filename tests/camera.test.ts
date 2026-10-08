import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { Grid, Tile } from "../src/core/grid";
import { SecurityCamera } from "../src/entities/securityCamera";

/** Salle 9×6 avec une caméra sur le mur du haut, qui regarde vers le bas (+Z). */
function createRoom(): Grid {
  const grid = new Grid(11, 8, Tile.Wall);
  for (let z = 1; z < 7; z++) for (let x = 1; x < 10; x++) grid.set(x, z, Tile.Floor);
  return grid;
}

const slot = { wallCell: { x: 5, z: 0 }, floorCell: { x: 5, z: 1 }, facing: Math.PI / 2 };
const standing = (x: number, z: number) => ({ position: new THREE.Vector3(x, 0, z), posture: "standing" as const, isMoving: false });

function run(camera: SecurityCamera, player: ReturnType<typeof standing> | null, seconds: number, start = 0): number {
  let maxAlarm = 0;
  for (let time = start; time < start + seconds; time += 1 / 30) {
    camera.update(1 / 30, time, player);
    maxAlarm = Math.max(maxAlarm, camera.alarm);
  }
  return maxAlarm;
}

describe("SecurityCamera", () => {
  it("finit par repérer un agent debout dans son champ pendant son balayage", () => {
    const camera = new SecurityCamera(createRoom(), slot);
    expect(run(camera, standing(5.5, 4), 8)).toBeGreaterThan(0.3);
  });

  it("ne voit rien quand elle est brouillée ou coupée au pare-feu", () => {
    const emp = new SecurityCamera(createRoom(), slot);
    emp.disableUntil(20);
    expect(run(emp, standing(5.5, 4), 8)).toBe(0);
    const firewalled = new SecurityCamera(createRoom(), slot);
    firewalled.firewall();
    expect(run(firewalled, standing(5.5, 4), 8)).toBe(0);
  });

  it("ne voit pas derrière un obstacle", () => {
    const grid = createRoom();
    for (let x = 1; x < 10; x++) grid.set(x, 3, Tile.Cover);
    const camera = new SecurityCamera(grid, slot);
    expect(run(camera, standing(5.5, 5), 8)).toBe(0);
  });
});
