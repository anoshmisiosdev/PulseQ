/**
 * Pure maths behind the landing page's two scroll scenes and its live demo.
 *
 * Kept out of the component and free of DOM access so the numbers can be
 * tested directly — the scenes are the page, and a drifted constant is a
 * visual bug nobody notices until a card overlaps the wrong beat.
 *
 * Every constant here traces to docs/PORT-NOTES.md §3 and §4.
 */

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

/** easeOutCubic — the page's only easing curve. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/* ── live demo (PORT-NOTES §4) ───────────────────────────────────────────── */

export interface Vertical {
  label: string;
  /** How the copy names the usual gap, e.g. "three days". */
  interval: string;
  /** Slider ceiling in days. */
  max: number;
  /** The customer's own baseline gap in days — risk is measured against this. */
  base: number;
}

export const VERTICALS: Record<"cafe" | "gym" | "salon", Vertical> = {
  cafe: { label: "Café", interval: "three days", max: 60, base: 3 },
  gym: { label: "Gym", interval: "four days", max: 70, base: 4 },
  salon: { label: "Salon", interval: "five weeks", max: 180, base: 35 },
};

export type VerticalKey = keyof typeof VERTICALS;

/**
 * Risk from how far past their own rhythm a customer is.
 *
 * Log-scaled, so doubling the gap is a fixed step rather than a cliff: one
 * missed interval reads as a wobble, four as an emergency. The 0.5 floor stops
 * a just-visited customer driving the score negative.
 *
 * This mirrors the product's transparent weighted heuristic. If the real
 * scoring engine's shape changes, change it here too — a demo that disagrees
 * with the dashboard is worse than no demo.
 */
export function riskScore(days: number, base: number): number {
  const ratio = days / base;
  return Math.round(clamp(Math.log2(Math.max(ratio, 0.5)) * 26 + 12, 2, 99));
}

export type BandLabel = "Critical" | "At risk" | "Watch" | "Healthy";

export interface Band {
  label: BandLabel;
  /** A token reference, never a literal — see the palette in index.css. */
  color: string;
}

export function riskBand(score: number): Band {
  if (score >= 80) return { label: "Critical", color: "var(--terracotta)" };
  if (score >= 55) return { label: "At risk", color: "var(--terracotta-mid)" };
  if (score >= 32) return { label: "Watch", color: "var(--muted-body)" };
  return { label: "Healthy", color: "var(--green)" };
}

/** The sentence beside the dial — the real output shape of a risk reason. */
export function bandQuote(band: BandLabel, days: number, ratio: number): string {
  const gap = `${ratio.toFixed(1)}× their usual gap`;
  switch (band) {
    case "Healthy":
      return "Right on rhythm. Nothing to do here.";
    case "Watch":
      return `A little late, ${gap}. Worth keeping an eye on.`;
    case "At risk":
      return `${days} days out — ${gap}, and spend was already softening.`;
    case "Critical":
      return `${days} days out — ${gap}. This one walks if nobody reaches out.`;
  }
}

export function bandAction(band: BandLabel): string {
  switch (band) {
    case "Healthy":
      return "No message queued.";
    case "Watch":
      return "Held back. Churnary waits for a clearer signal.";
    case "At risk":
      return "Draft ready, mentioning their usual order.";
    case "Critical":
      return "Top of today’s list. Draft waiting on your approval.";
  }
}

/** Dial geometry: an SVG circle of r=43, dashed to `score`% of its perimeter. */
export const DIAL_RADIUS = 43;

export function dialDash(score: number): string {
  const circumference = 2 * Math.PI * DIAL_RADIUS;
  return `${((circumference * score) / 100).toFixed(1)} ${circumference.toFixed(1)}`;
}

/* ── pinned scene (PORT-NOTES §3) ────────────────────────────────────────── */

/** Progress through a pinned scene: 0 as it locks, 1 as it releases. */
export function sceneProgress(rectTop: number, sceneHeight: number, vh: number): number {
  const travel = sceneHeight - vh;
  if (travel <= 0) return 0;
  return clamp(-rectTop / travel, 0, 1);
}

export interface BeatVisibility {
  visA: number;
  visB: number;
  /** Drift progress for beat A's cards. */
  pa: number;
  /** Drift progress for beat B's cards. */
  pb: number;
}

/**
 * The two beats' opacity and drift progress at scene progress `p`.
 *
 * The gap between visA hitting 0 (p=0.46) and visB leaving 0 (p=0.50) is
 * deliberate: the beats share one frame, and both being visible at once is a
 * bug that shipped before. Widen the ramps and they will overlap again.
 */
export function beatVisibility(p: number): BeatVisibility {
  return {
    pa: easeOut(clamp(p / 0.3, 0, 1)),
    pb: easeOut(clamp((p - 0.52) / 0.3, 0, 1)),
    visA: 1 - clamp((p - 0.4) / 0.06, 0, 1),
    visB: clamp((p - 0.5) / 0.06, 0, 1),
  };
}

/** How far off-screen a drifting card starts. */
export function driftReach(viewportWidth: number): number {
  return Math.max(viewportWidth * 0.42, 380);
}

export interface DriftState {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
}

/**
 * One card's drift toward the centre. `index` staggers the group by 0.07 so the
 * three inputs land in sequence rather than as a block.
 */
export function driftState(
  ownProgress: number,
  index: number,
  side: -1 | 1,
  reach: number,
  visibility: number
): DriftState {
  const e = easeOut(clamp((ownProgress - index * 0.07) / 0.8, 0, 1));
  return {
    x: side * (1 - e) * reach,
    y: (1 - e) * side * 14,
    scale: 0.94 + e * 0.06,
    rotate: side * (1 - e) * 5,
    opacity: clamp(e, 0, 1) * visibility,
  };
}

/* ── signal feed (PORT-NOTES §3) ─────────────────────────────────────────── */

/** Where a signal card has to sit to be the active one. */
export const SIGNAL_FOCUS = 0.44;

/** Opacity for signal card `i` given the active index. */
export function signalOpacity(i: number, active: number, engaged: boolean): number {
  if (!engaged) return 0.28;
  if (i === active) return 1;
  return i < active ? 0.42 : 0.28;
}
