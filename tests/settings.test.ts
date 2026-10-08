import { describe, expect, it } from "vitest";
import { defaultQuality, FrameRateMonitor, lowerQuality, nextQuality, SettingsStore } from "../src/core/settings";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("qualité graphique", () => {
  it("choisit moyenne sur mobile, haute sur ordinateur", () => {
    expect(defaultQuality(true)).toBe("medium");
    expect(defaultQuality(false)).toBe("high");
  });

  it("descend d'un cran jusqu'à basse, et le bouton boucle", () => {
    expect(lowerQuality("high")).toBe("medium");
    expect(lowerQuality("low")).toBeNull();
    expect(nextQuality("low")).toBe("high");
  });

  it("mémorise le choix et ignore un réglage corrompu", () => {
    const storage = new MemoryStorage();
    new SettingsStore(storage, false).setQuality("low");
    expect(new SettingsStore(storage, false).quality).toBe("low");
    storage.setItem("shadow-ops-devops/settings", '{"quality":"ultra"}');
    expect(new SettingsStore(storage, true).quality).toBe("medium");
    storage.setItem("shadow-ops-devops/settings", "{oups");
    expect(new SettingsStore(storage, false).quality).toBe("high");
  });

  it("mémorise le son coupé sans perdre la qualité choisie", () => {
    const storage = new MemoryStorage();
    expect(new SettingsStore(storage, false).soundEnabled).toBe(true);
    const settings = new SettingsStore(storage, false);
    settings.setQuality("low");
    settings.setSoundEnabled(false);
    const reloaded = new SettingsStore(storage, false);
    expect(reloaded.soundEnabled).toBe(false);
    expect(reloaded.quality).toBe("low");
    storage.setItem("shadow-ops-devops/settings", '{"quality":"low","soundEnabled":"non"}');
    expect(new SettingsStore(storage, false)).toMatchObject({ quality: "low", soundEnabled: true });
  });
});

describe("FrameRateMonitor", () => {
  const run = (monitor: FrameRateMonitor, fps: number, seconds: number): boolean => {
    let flagged = false;
    for (let time = 0; time < seconds; time += 1 / fps) flagged = monitor.sample(1 / fps) || flagged;
    return flagged;
  };

  it("ne signale rien à 60 images/s", () => {
    expect(run(new FrameRateMonitor(), 60, 12)).toBe(false);
  });

  it("signale un appareil qui plafonne à 25 images/s, après l'échauffement", () => {
    const monitor = new FrameRateMonitor();
    expect(run(monitor, 25, 2.5)).toBe(false);
    expect(run(monitor, 25, 6)).toBe(true);
  });
});
