import { describe, expect, it } from "vitest";
import {
  beatVisibility,
  dialDash,
  driftReach,
  driftState,
  riskBand,
  riskScore,
  sceneProgress,
  signalOpacity,
  VERTICALS,
} from "./landingScene";

/**
 * The landing page's scroll scenes and demo dial are driven entirely by these
 * numbers, and a drifted constant shows up as a layout bug rather than a test
 * failure. The dead-zone case below is a regression test: the two beats of the
 * pinned scene sharing a frame is a bug that shipped once.
 */

describe("beatVisibility", () => {
  it("never shows both beats at once", () => {
    // Walk the whole scene at a finer step than a scroll event can produce.
    for (let p = 0; p <= 1.0001; p += 0.001) {
      const { visA, visB } = beatVisibility(p);
      expect(Math.min(visA, visB)).toBeLessThan(0.021);
    }
  });

  it("retires beat A by p=0.46 and holds B back until p=0.50", () => {
    expect(beatVisibility(0.4).visA).toBeCloseTo(1, 5);
    expect(beatVisibility(0.46).visA).toBeCloseTo(0, 5);
    expect(beatVisibility(0.5).visB).toBeCloseTo(0, 5);
    expect(beatVisibility(0.56).visB).toBeCloseTo(1, 5);
  });

  it("leaves a dead zone where neither beat is on screen", () => {
    const { visA, visB } = beatVisibility(0.48);
    expect(visA).toBe(0);
    expect(visB).toBe(0);
  });
});

describe("sceneProgress", () => {
  it("runs 0→1 across the scene's scrollable travel", () => {
    const height = 3400;
    const vh = 1000;
    // -0 here: negating a 0 rect top. Identical in a transform.
    expect(sceneProgress(0, height, vh)).toBeCloseTo(0, 10);
    expect(sceneProgress(-1200, height, vh)).toBeCloseTo(0.5, 5);
    expect(sceneProgress(-2400, height, vh)).toBe(1);
  });

  it("clamps outside the scene instead of running past the ends", () => {
    expect(sceneProgress(500, 3400, 1000)).toBeCloseTo(0, 10);
    expect(sceneProgress(-9999, 3400, 1000)).toBe(1);
  });

  it("returns 0 when the scene is shorter than the viewport", () => {
    // Guards a divide-by-zero that would otherwise yield NaN transforms.
    expect(sceneProgress(-10, 800, 1000)).toBe(0);
  });
});

describe("driftState", () => {
  it("starts off-screen and settles at the centre", () => {
    const reach = driftReach(1440);
    const start = driftState(0, 0, -1, reach, 1);
    expect(start.x).toBeCloseTo(-reach, 5);
    expect(start.opacity).toBe(0);

    const end = driftState(1, 0, -1, reach, 1);
    expect(end.x).toBeCloseTo(0, 5);
    expect(end.scale).toBeCloseTo(1, 5);
    expect(end.rotate).toBeCloseTo(0, 5);
    expect(end.opacity).toBeCloseTo(1, 5);
  });

  it("staggers later cards behind earlier ones", () => {
    const reach = driftReach(1440);
    const first = driftState(0.3, 0, 1, reach, 1);
    const third = driftState(0.3, 2, 1, reach, 1);
    expect(Math.abs(third.x)).toBeGreaterThan(Math.abs(first.x));
  });

  it("mirrors direction by side", () => {
    const reach = driftReach(1440);
    expect(driftState(0.2, 0, -1, reach, 1).x).toBeLessThan(0);
    expect(driftState(0.2, 0, 1, reach, 1).x).toBeGreaterThan(0);
  });

  it("keeps a floor on reach so cards clear narrow viewports", () => {
    expect(driftReach(500)).toBe(380);
    expect(driftReach(2000)).toBe(840);
  });
});

describe("riskScore", () => {
  it("reads a customer on their own rhythm as healthy", () => {
    const { base } = VERTICALS.cafe;
    expect(riskBand(riskScore(base, base)).label).toBe("Healthy");
  });

  it("escalates as the gap multiplies", () => {
    const { base } = VERTICALS.cafe;
    const bands = [1, 2, 4, 8].map((m) => riskBand(riskScore(base * m, base)).label);
    expect(bands).toEqual(["Healthy", "Watch", "At risk", "Critical"]);
  });

  it("scales per vertical, so five weeks is normal for a salon", () => {
    // 35 days: routine for a salon client, terminal for a café regular.
    expect(riskBand(riskScore(35, VERTICALS.salon.base)).label).toBe("Healthy");
    expect(riskBand(riskScore(35, VERTICALS.cafe.base)).label).toBe("Critical");
  });

  it("stays inside 2–99 across every slider position", () => {
    for (const v of Object.values(VERTICALS)) {
      for (let days = 1; days <= v.max; days++) {
        const s = riskScore(days, v.base);
        expect(s).toBeGreaterThanOrEqual(2);
        expect(s).toBeLessThanOrEqual(99);
        expect(Number.isInteger(s)).toBe(true);
      }
    }
  });

  it("floors the ratio so a just-visited customer cannot go negative", () => {
    expect(riskScore(1, 180)).toBeGreaterThanOrEqual(2);
  });
});

describe("riskBand", () => {
  it("switches at the documented cutoffs", () => {
    expect(riskBand(80).label).toBe("Critical");
    expect(riskBand(79).label).toBe("At risk");
    expect(riskBand(55).label).toBe("At risk");
    expect(riskBand(54).label).toBe("Watch");
    expect(riskBand(32).label).toBe("Watch");
    expect(riskBand(31).label).toBe("Healthy");
  });

  it("colours every band from a token, never a literal", () => {
    [10, 40, 60, 90].forEach((s) => expect(riskBand(s).color).toMatch(/^var\(--/));
  });
});

describe("dialDash", () => {
  it("dashes the arc to the score's share of the circle", () => {
    const full = 2 * Math.PI * 43;
    const [drawn, total] = dialDash(50).split(" ").map(Number);
    expect(total).toBeCloseTo(full, 1);
    expect(drawn).toBeCloseTo(full / 2, 1);
  });
});

describe("signalOpacity", () => {
  it("lights the active card and dims the rest", () => {
    expect(signalOpacity(2, 2, true)).toBe(1);
    expect(signalOpacity(1, 2, true)).toBe(0.42);
    expect(signalOpacity(3, 2, true)).toBe(0.28);
  });

  it("rests the whole feed when the section is off screen", () => {
    expect(signalOpacity(2, 2, false)).toBe(0.28);
  });
});
