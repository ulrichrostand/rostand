import { describe, expect, it } from "vitest";
import { createSentinelIdentity, isWeaponCommandCorrect, unlockedWeapons, weaponById } from "../src/combat/weapons";
import { CURRICULUM } from "../src/content/curriculum";

const moduleIds = CURRICULUM.map((module) => module.id);
const target = createSentinelIdentity(42, 3);

describe("identité des sentinelles", () => {
  it("est déterministe et plausible", () => {
    expect(createSentinelIdentity(42, 3)).toEqual(target);
    expect(target.pid).toBeGreaterThanOrEqual(3000);
    expect(target.containerId).toMatch(/^[0-9a-f]{12}$/);
    expect(target.podName.startsWith("sentinelle-3-")).toBe(true);
  });
  it("différencie deux sentinelles d'un même secteur", () => {
    expect(createSentinelIdentity(42, 4).pid).not.toBe(target.pid);
  });
});

describe("gadgets", () => {
  it("se débloquent au fil de la campagne", () => {
    expect(unlockedWeapons(moduleIds, "genesis")).toEqual([]);
    expect(unlockedWeapons(moduleIds, "kernel").map((weapon) => weapon.id)).toEqual(["kill"]);
    expect(unlockedWeapons(moduleIds, "container").map((weapon) => weapon.id)).toEqual(["kill", "docker"]);
    expect(unlockedWeapons(moduleIds, "architect").map((weapon) => weapon.id)).toEqual(["kill", "docker", "kubectl"]);
  });

  it("chaque module de déblocage existe dans la campagne", () => {
    for (const id of ["kill", "docker", "kubectl"] as const) expect(moduleIds).toContain(weaponById(id).unlockModuleId);
  });

  it("kill accepte le PID de la cible, avec ou sans signal, et refuse un autre PID", () => {
    const kill = weaponById("kill");
    expect(isWeaponCommandCorrect(kill, target, `kill ${target.pid}`)).toBe(true);
    expect(isWeaponCommandCorrect(kill, target, `sudo kill -9 ${target.pid}`)).toBe(true);
    expect(isWeaponCommandCorrect(kill, target, "kill 812")).toBe(false);
    expect(isWeaponCommandCorrect(kill, target, "")).toBe(false);
  });

  it("docker accepte le nom ou l'identifiant du conteneur", () => {
    const docker = weaponById("docker");
    expect(isWeaponCommandCorrect(docker, target, "docker stop sentinelle-3")).toBe(true);
    expect(isWeaponCommandCorrect(docker, target, `docker stop ${target.containerId}`)).toBe(true);
    expect(isWeaponCommandCorrect(docker, target, "docker stop web")).toBe(false);
  });

  it("kubectl exige le nom complet du pod", () => {
    const kubectl = weaponById("kubectl");
    expect(isWeaponCommandCorrect(kubectl, target, `kubectl delete pod ${target.podName}`)).toBe(true);
    expect(isWeaponCommandCorrect(kubectl, target, "kubectl delete pod sentinelle-3")).toBe(false);
  });

  it("la sortie de repérage contient bien la cible", () => {
    expect(weaponById("kill").listing(target).join("\n")).toContain(String(target.pid));
    expect(weaponById("docker").listing(target).join("\n")).toContain(target.containerName);
    expect(weaponById("kubectl").listing(target).join("\n")).toContain(target.podName);
  });
});
