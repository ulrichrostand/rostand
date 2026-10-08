import { describe, expect, it } from "vitest";
import { isStepCommandCorrect, simulateWrongCommand } from "../src/challenges/scenario";
import { CURRICULUM } from "../src/content/curriculum";
import { SCENARIOS } from "../src/content/scenarios";

describe("scénarios de terminal", () => {
  it.each(CURRICULUM.map((module) => [module.id] as const))("le module %s a un scénario cohérent", (moduleId) => {
    const scenario = SCENARIOS[moduleId];
    expect(scenario).toBeDefined();
    expect(scenario!.steps.length).toBeGreaterThanOrEqual(4);
    for (const step of scenario!.steps) {
      expect(step.goal.length).toBeGreaterThan(15);
      expect(step.accepted.length).toBeGreaterThan(0);
      // La commande canonique (montrée en solution) doit toujours être acceptée.
      for (const command of step.accepted) expect(isStepCommandCorrect(step, command)).toBe(true);
      for (const pattern of step.patterns ?? []) expect(() => new RegExp(pattern)).not.toThrow();
    }
  });

  it("accepte sudo, les guillemets simples et un message de commit libre", () => {
    const kernelInstall = SCENARIOS.kernel!.steps[3]!;
    expect(isStepCommandCorrect(kernelInstall, "sudo apt install nginx")).toBe(true);
    const commit = SCENARIOS.branch!.steps[3]!;
    expect(isStepCommandCorrect(commit, "git commit -m 'répare la connexion'")).toBe(true);
    expect(isStepCommandCorrect(commit, "git commit")).toBe(false);
  });

  it("accepte les options de docker run dans n'importe quel ordre, mais pas incomplètes", () => {
    const run = SCENARIOS.container!.steps[2]!;
    expect(isStepCommandCorrect(run, "docker run --name api -p 8080:80 -d api:1.0")).toBe(true);
    expect(isStepCommandCorrect(run, "docker run -d --name api --publish 8080:80 api:1.0")).toBe(true);
    expect(isStepCommandCorrect(run, "docker run -d -p 8080:80 api:1.0")).toBe(false);
    expect(isStepCommandCorrect(run, "docker run -p 8080:80 --name api api:1.0")).toBe(false);
  });

  it("répond comme un vrai terminal à une commande inconnue", () => {
    expect(simulateWrongCommand("sl")).toEqual(["bash: sl: command not found"]);
    expect(simulateWrongCommand("ls -z")[0]).toContain("pas ce qui est demandé");
    expect(simulateWrongCommand("   ")).toEqual([]);
  });
});
