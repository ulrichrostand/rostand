import { describe, expect, it } from "vitest";
import { decodeSaveCode, encodeSaveCode, SaveCodeError } from "../src/game/saveCode";
import { emptyProgress, parseCheckpoint, parseProgress, ProgressStore, type KeyValueStorage, type MissionCheckpoint } from "../src/game/progress";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const checkpoint: Omit<MissionCheckpoint, "savedAt" | "layoutVersion"> = {
  moduleId: "kernel",
  hackedTerminals: [0, 2],
  wrongAttemptsPerTerminal: [0, 0, 1, 0, 0],
  collectedIntel: [0],
  readLessons: [0, 2],
  neutralizedGuards: [1],
  firewalledCameras: [0],
  charges: 3,
  ammo: 2,
  livesLeft: 2,
  detections: 1,
  neutralizations: 1,
  elapsedSeconds: 95.5,
  playerCell: { x: 12, z: 7 },
};

describe("point de reprise", () => {
  it("est sauvegardé, relu, puis effacé quand la mission se termine", () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    let savedCount = 0;
    store.onSaved = () => savedCount++;
    store.saveCheckpoint(checkpoint);
    expect(savedCount).toBe(1);
    expect(new ProgressStore(storage).checkpoint).toMatchObject(checkpoint);
    store.saveResult("kernel", { bestScore: 300, stars: 2, ghost: false });
    expect(new ProgressStore(storage).checkpoint).toBeNull();
  });

  it("rejette un point de reprise incohérent", () => {
    expect(parseCheckpoint({ ...checkpoint, savedAt: "x", livesLeft: 0 })).toBeNull();
    expect(parseCheckpoint({ ...checkpoint, savedAt: "x", hackedTerminals: [-1] })).toBeNull();
    expect(parseCheckpoint({ ...checkpoint, savedAt: "x", moduleId: "../../etc" })).toBeNull();
    expect(parseCheckpoint({ ...checkpoint, savedAt: "x", charges: 1.5 })).toBeNull();
  });

  it("lit encore l'ancien format de sauvegarde (version 1)", () => {
    const legacy = JSON.stringify({ version: 1, records: { genesis: { bestScore: 10, stars: 1, ghost: false, completedAt: "x" } } });
    const progress = parseProgress(legacy);
    expect(progress.records.genesis?.bestScore).toBe(10);
    expect(progress.checkpoint).toBeNull();
  });

  it("ignore les clés dangereuses (pollution de prototype)", () => {
    const malicious = '{"records":{"__proto__":{"bestScore":1,"stars":1,"ghost":true,"completedAt":"x"}}}';
    const progress = parseProgress(malicious);
    expect(Object.keys(progress.records)).toEqual([]);
    expect(({} as Record<string, unknown>).bestScore).toBeUndefined();
  });
});

describe("code de sauvegarde", () => {
  const progress = {
    ...emptyProgress(),
    records: { genesis: { bestScore: 650, stars: 3 as const, ghost: true, completedAt: "2026-10-08T00:00:00.000Z" } },
    checkpoint: { ...checkpoint, layoutVersion: 2, savedAt: "2026-10-08T00:00:00.000Z" },
  };

  it("fait l'aller-retour sans perte, même avec des espaces ou retours à la ligne", () => {
    const code = encodeSaveCode(progress);
    expect(code.startsWith("SHADOWOPS1.")).toBe(true);
    const decoded = decodeSaveCode(` ${code.slice(0, 20)}\n${code.slice(20)} `);
    expect(decoded.records.genesis).toEqual(progress.records.genesis);
    expect(decoded.checkpoint).toEqual(progress.checkpoint);
  });

  it("détecte un code tronqué, modifié ou étranger", () => {
    const code = encodeSaveCode(progress);
    expect(() => decodeSaveCode(code.slice(0, -10))).toThrow(SaveCodeError);
    expect(() => decodeSaveCode(code.replace("SHADOWOPS1.", "SHADOWOPS1.A"))).toThrow(SaveCodeError);
    expect(() => decodeSaveCode("bonjour")).toThrow(SaveCodeError);
    expect(() => decodeSaveCode("")).toThrow(SaveCodeError);
    expect(() => decodeSaveCode("x".repeat(60_000))).toThrow(SaveCodeError);
  });
});
