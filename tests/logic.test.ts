import { describe, expect, it } from "vitest";
import { isAnswerCorrect, normalizeCommand } from "../src/challenges/evaluate";
import { CURRICULUM } from "../src/content/curriculum";
import { computeMissionScore } from "../src/game/scoring";
import { isModuleUnlocked, parseProgress, ProgressStore, type KeyValueStorage } from "../src/game/progress";

describe("normalizeCommand", () => {
  it("ignore espaces, guillemets, prompt et sudo", () => {
    expect(normalizeCommand("  $ sudo   grep  'ERROR'   app.log ")).toBe('grep "ERROR" app.log');
  });
});

describe("isAnswerCorrect", () => {
  const command = { kind: "command" as const, prompt: "", acceptedAnswers: ["nginx -t"], hint: "", explanation: "" };
  it("accepte une commande équivalente", () => {
    expect(isAnswerCorrect(command, { kind: "command", typedCommand: " sudo nginx  -t" })).toBe(true);
    expect(isAnswerCorrect(command, { kind: "command", typedCommand: "" })).toBe(false);
  });
  it("vérifie l'ordre exact", () => {
    const order = { kind: "order" as const, prompt: "", steps: ["a", "b", "c"], explanation: "" };
    expect(isAnswerCorrect(order, { kind: "order", orderedSteps: ["a", "b", "c"] })).toBe(true);
    expect(isAnswerCorrect(order, { kind: "order", orderedSteps: ["b", "a", "c"] })).toBe(false);
  });
  it("rejette un type de réponse incohérent", () => {
    expect(() => isAnswerCorrect(command, { kind: "choice", selectedIndex: 0 })).toThrow(TypeError);
  });
});

describe("curriculum", () => {
  it("contient 15 modules aux id uniques", () => {
    expect(CURRICULUM).toHaveLength(15);
    expect(new Set(CURRICULUM.map((module) => module.id)).size).toBe(CURRICULUM.length);
  });

  it.each(CURRICULUM.map((module) => [module.id, module] as const))("module %s est cohérent", (_id, module) => {
    expect(module.challenges.length).toBeGreaterThanOrEqual(5);
    expect(module.recap.length).toBeGreaterThanOrEqual(4);
    for (const challenge of module.challenges) {
      expect(challenge.explanation.length).toBeGreaterThan(20);
      if (challenge.kind === "choice") {
        expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
        expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
        expect(new Set(challenge.options).size).toBe(challenge.options.length);
      }
      if (challenge.kind === "command") {
        expect(challenge.acceptedAnswers.length).toBeGreaterThan(0);
        // La 1re réponse acceptée doit valider le défi après normalisation.
        expect(isAnswerCorrect(challenge, { kind: "command", typedCommand: challenge.acceptedAnswers[0]! })).toBe(true);
      }
      if (challenge.kind === "order") {
        expect(challenge.steps.length).toBeGreaterThanOrEqual(3);
        expect(new Set(challenge.steps).size).toBe(challenge.steps.length);
      }
    }
  });
});

describe("computeMissionScore", () => {
  it("donne 3 étoiles et le bonus fantôme pour un sans-faute", () => {
    const result = computeMissionScore({ terminalCount: 5, wrongAttemptsPerTerminal: [0, 0, 0, 0, 0], detections: 0, elapsedSeconds: 120 });
    expect(result).toMatchObject({ score: 650, maxScore: 650, stars: 3, ghost: true, firstTryAccuracy: 1 });
  });
  it("ne descend jamais sous zéro", () => {
    const result = computeMissionScore({ terminalCount: 5, wrongAttemptsPerTerminal: [9, 9, 9, 9, 9], detections: 10, elapsedSeconds: 1 });
    expect(result.score).toBe(0);
    expect(result.stars).toBe(1);
  });
});

describe("progress", () => {
  class MemoryStorage implements KeyValueStorage {
    values = new Map<string, string>();
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
  }

  it("résiste à une sauvegarde corrompue", () => {
    expect(parseProgress("{not json").records).toEqual({});
    expect(Object.keys(parseProgress('{"records":{"a":{"bestScore":"x"}}}').records)).toEqual([]);
  });

  it("garde le meilleur score et persiste", () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    store.saveResult("kernel", { bestScore: 500, stars: 2, ghost: true });
    store.saveResult("kernel", { bestScore: 300, stars: 1, ghost: false });
    const reloaded = new ProgressStore(storage).recordFor("kernel");
    expect(reloaded).toMatchObject({ bestScore: 500, stars: 2, ghost: true });
  });

  it("débloque les modules dans l'ordre", () => {
    const ids = ["a", "b", "c"];
    const progress = parseProgress(JSON.stringify({ records: { a: { bestScore: 1, stars: 1, ghost: false, completedAt: "" } } }));
    expect(isModuleUnlocked(ids, "a", progress)).toBe(true);
    expect(isModuleUnlocked(ids, "b", progress)).toBe(true);
    expect(isModuleUnlocked(ids, "c", progress)).toBe(false);
  });
});
