import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Landing from "./Landing";

/**
 * The landing page's copy, figures and semantics are the contract with the
 * reference build (docs/PORT-NOTES.md §5): the quoted numbers are sourced from
 * the live site, the compliance block is legal copy rather than marketing, and
 * the removal of the monthly prices was deliberate. All three are the kind of
 * thing an unrelated edit silently undoes.
 */

// The waitlist form links to /privacy, so the page needs router context.
const html = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Landing semantics", () => {
  it("has exactly one h1", () => {
    expect(html().match(/<h1/g)).toHaveLength(1);
  });

  it("never skips a heading level", () => {
    const levels = [...html().matchAll(/<h([1-3])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1);
    });
  });

  it("marks stat pairs up as description lists, not divs", () => {
    const markup = html();
    expect(markup).toContain("<dl");
    expect(markup).toContain("<dt");
    expect(markup).toContain("<dd");
  });

  it("numbers the how-it-works steps with an ordered list", () => {
    const markup = html();
    expect(markup).toMatch(/<ol[^>]*class="chn-steps"/);
    expect(markup.match(/<li/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("backs the decorative marquee with readable text", () => {
    const markup = html();
    // The animated strip is aria-hidden, so this sentence is the only version
    // of it a screen reader will ever reach.
    expect(markup).toContain('class="chn-marquee-track" data-still="0" aria-hidden="true"');
    expect(markup).toContain(
      "Built for cafés, coffee shops, salons, barbershops, fitness studios, gyms, med spas, juice bars, bakeries and yoga studios."
    );
  });
});

describe("Landing content that must not drift", () => {
  it("quotes the figures sourced from the live site", () => {
    const markup = html();
    ["$5,806", "21 days", "$640", "~$970", "2 min", "day 8"].forEach((figure) =>
      expect(markup).toContain(figure)
    );
  });

  it("keeps the compliance copy verbatim", () => {
    const markup = html();
    expect(markup).toContain("An unsubscribe link in every single email. Not a setting.");
    expect(markup).toContain(
      "No SMS before 9am or after 8pm in the customer&#x27;s own time zone. STOP is honoured instantly."
    );
    expect(markup).toContain(
      "No medical or treatment data ingested — only name, contact, visit times and spend."
    );
    expect(markup).toContain(
      "A per-business deletion endpoint, OAuth tokens encrypted at rest. Leaving is one request."
    );
  });

  it("shows plan names and features but no monthly figures", () => {
    const markup = html();
    ["Starter", "Growth", "Pro", "Most popular"].forEach((name) =>
      expect(markup).toContain(name)
    );
    // Removed on purpose — see PORT-NOTES §5. Put them back deliberately, not
    // by accident.
    ["$199", "$299", "$499"].forEach((price) => expect(markup).not.toContain(price));
  });

  it("uses the icon in nav and footer, never the illegible lockups", () => {
    const markup = html();
    expect(markup).toContain("icon.png");
    expect(markup).not.toContain("logo-dark");
    expect(markup).not.toContain("logo-light");
  });
});

describe("Landing styling", () => {
  it("takes every colour from a token rather than a literal hex", () => {
    // The reference build inlines hex everywhere; the port routes all of it
    // through the palette in index.css so the two stay in step.
    const hex = html().match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    // url(%23g) in the grain data URI is escaped, so nothing should remain.
    expect(hex).toEqual([]);
  });
});

describe("Landing scroll scenes", () => {
  it("renders the pinned scene with both beats and a full set of drift cards", () => {
    const markup = html();
    expect(markup).toContain('data-scene="flow"');
    expect(markup).toContain('data-beat="a"');
    expect(markup).toContain('data-beat="b"');
    expect(markup.match(/data-drift="left"/g)).toHaveLength(5);
    expect(markup.match(/data-drift="right"/g)).toHaveLength(5);
    expect(markup.match(/data-group="a"/g)).toHaveLength(6);
    expect(markup.match(/data-group="b"/g)).toHaveLength(4);
  });

  it("pairs each signal card with a sticky-panel line at the same index", () => {
    const markup = html();
    const signals = [...markup.matchAll(/data-signal="1" data-i="(\d)"/g)].map((m) => m[1]);
    const lines = [...markup.matchAll(/data-line="1" data-i="(\d)"/g)].map((m) => m[1]);
    expect(signals).toEqual(["0", "1", "2", "3", "4"]);
    expect(lines).toEqual(signals);
  });

  it("is fully readable with no JS: nothing is hidden by CSS", () => {
    // prime() sets the pre-animation state from JS on mount. If any of it ever
    // moves into the stylesheet, a failed bundle blanks the page.
    const markup = html();
    expect(markup).not.toMatch(/style="[^"]*opacity:\s*0/);
  });

  it("swaps the pinned scene for a static list under reduced motion", () => {
    stubMatchMedia(true);
    const markup = html();
    expect(markup).not.toContain('data-scene="flow"');
    expect(markup).not.toContain("data-drift");
    // Same content, still both beats — just no sticky and no drift.
    expect(markup).toContain("A recovered regular comes out.");
    expect(markup).toContain("By month six, it writes it for you.");
    expect(markup).toContain("Approved. Sent as written.");
    expect(markup).toContain("chn-flow-static");
  });

  it("stops the marquee under reduced motion", () => {
    stubMatchMedia(true);
    expect(html()).toContain('data-still="1"');
  });
});

describe("Landing waitlist", () => {
  it("wires the real form, with the name the API requires", () => {
    const markup = html();
    // React's static renderer keeps autoComplete's camelCase; HTML attribute
    // names are case-insensitive, so match either spelling.
    expect(markup).toMatch(/autocomplete="name"/i);
    expect(markup).toContain('type="email"');
    // The honeypot the endpoint checks for bots.
    expect(markup).toContain('name="website"');
    expect(markup).toContain("Join the waitlist");
  });
});

/** Make every media query match, as prefers-reduced-motion would. */
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal("window", {
    matchMedia: () => ({
      matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}
