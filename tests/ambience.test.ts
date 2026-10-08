import { describe, expect, it } from "vitest";
import { ambienceLevels, nextBlipDelay } from "../src/core/ambience";

describe("ambiance sonore", () => {
  it("la tension monte avec l'exposition, discrètement au début", () => {
    const calm = ambienceLevels(0, false);
    const half = ambienceLevels(0.5, false);
    const spotted = ambienceLevels(1, false);
    expect(calm.tension).toBeLessThan(0.001);
    expect(half.tension).toBeLessThan(spotted.tension / 2);
    expect(spotted.pulseRate).toBeGreaterThan(calm.pulseRate);
    expect(spotted.tensionCutoff).toBeGreaterThan(calm.tensionCutoff);
  });

  it("borne une exposition hors limites", () => {
    expect(ambienceLevels(7, false)).toEqual(ambienceLevels(1, false));
    expect(ambienceLevels(-2, false)).toEqual(ambienceLevels(0, false));
  });

  it("baisse le volume en pause et dans les terminaux", () => {
    expect(ambienceLevels(0.3, true).bus).toBeLessThan(ambienceLevels(0.3, false).bus);
  });

  it("espace les bips de 2,5 à 7 secondes", () => {
    expect(nextBlipDelay(() => 0)).toBe(2.5);
    expect(nextBlipDelay(() => 0.999)).toBeLessThan(7);
  });
});
