# Churnary landing — port notes

Everything below is what you need to rebuild this page in the real React app. No new
dependencies; the whole thing is one component plus one scroll effect.

---

## 1. Tokens

Add these once (CSS variables or a theme object). Every colour on the page is one of these.

| Token | Value | Used for |
| --- | --- | --- |
| `cream` | `#F4ECE0` | page background, text on dark |
| `cream-alt` | `#EFE3D1` | alternating section bands (Signals, Features, Pricing) |
| `card` | `#FDF8F0` | soft cards, hero dashboard, demo panel |
| `white` | `#FFFFFF` | hard-shadow cards in the pinned scene only |
| `ink` | `#2A211C` | body text, nav band, dark sections, Growth plan |
| `muted` | `#6E5B4D` | body copy |
| `faint` | `#A58C74` | labels, meta, eyebrows |
| `line` | `#E3D5C0` | hairlines, borders |
| `line-soft` | `#EDE0CC` | internal dividers inside cards |
| `terracotta` | `#B4532A` | the one accent — links, risk figures, step numbers |
| `terracotta-lt` | `#E09A5F` | "Most popular" label on dark |
| `green` | `#4F7A40` | recovered / healthy only |

`cream` is exactly the background baked into `logo-light.png`, and `ink` is exactly the
background baked into `logo-dark.png`. Do not drift these two values or the lockups will
show a seam.

**Type:** `Schibsted Grotesk` (400/500/600) for everything structural; `Newsreader`
(300/400 + italic) for section headings, pull quotes and the italic kicker lines.
Headlines are weight 500 at `letter-spacing: -.035em`; section headings are Newsreader 400
at `-.02em`.

**Grain:** one `position: fixed` overlay, `opacity: .045`, `mix-blend-mode: multiply`,
background is an inline `feTurbulence` SVG data URI. Applied from JS so bundlers don't
try to resolve the filter reference.

---

## 2. Brand assets

| File | Where |
| --- | --- |
| `assets/icon.png` (512²) | nav at 28px, footer at 26px, centre of the pinned scene at 62px. `border-radius: 23%` clips the white corners. |
| `assets/logo-dark.png` (1400×480) | cream lockup on `ink`. **Only usable at ≥90px tall** — below that the tagline turns to noise. Not currently used on the page. |
| `assets/logo-light.png` (1400×480) | dark lockup on `cream`, same size floor. Not currently used. |
| `assets/team-1..3.jpg` | Aditya, Pranjal, Soham respectively. Riyan has no photo — initials block on `cream-alt`. |

---

## 3. The scroll engine

One `requestAnimationFrame`-throttled `scroll` + `resize` listener drives everything.
No IntersectionObserver, no library. Structure:

```
componentDidMount -> collect() refs -> prime() initial states -> paint()
scroll/resize     -> rAF guard      -> paint()
```

`prime()` sets the pre-animation state (opacity 0, translateY) **from JS**, so the page is
fully readable if JS never runs. Don't move those into CSS.

`paint()` does five things:

1. **Nav** — `scrollY > 40` tightens padding and adds a shadow. The band stays `ink` always.
2. **Reveals** — any `[data-reveal]` whose top passes `88vh` gets `opacity 1 / translateY 0`.
3. **Hero tilt** — `[data-tilt]` rotates from 7° to 0° on `perspective(1600px)` as it enters.
4. **Pinned scene** — see below.
5. **Signal feed** — see below.

### Pinned scene (`[data-scene="flow"]`)

340vh tall, a 100vh `position: sticky` child. Scene progress `p = -rect.top / (height - vh)`.

Two beats share the frame and **never overlap** — this was a bug once, keep the dead zone:

```
visA = 1 - clamp((p - 0.40) / 0.06)   // A gone by p=0.46
visB =     clamp((p - 0.50) / 0.06)   // B arrives at p=0.50
```

Cards carry `data-drift="left|right"`, `data-group="a|b"`, `data-i`. Each animates
`translateX` from `±max(42vw, 380px)` to 0 with `easeOutCubic`, staggered `0.07` per index,
plus a small scale and de-rotate. Elements below `0.02` opacity get `visibility: hidden` so
they can't be clicked or read by AT.

Beat A = the three inputs (Square / Stripe / CSV) against the three outputs (score, draft,
attributed revenue). Beat B = the before/after: March draft you had to rewrite vs the
August draft you just approve.

### Signal feed (`[data-scene="wiki"]`)

Left column of `[data-signal]` cards, right column `position: sticky; top: 24vh`.
The card whose centre is nearest `44vh` is active. Cards at or before it sit at `.42`
opacity, the active one at `1`, everything after at `.28`. Sticky-panel lines
(`[data-line]`, same `data-i`) fade in for every index `<= active`. The whole thing only
engages while the section straddles the viewport, so it resets cleanly on either side.

---

## 4. Live demo

Pure function, no API. Per-vertical config:

```js
cafe  { interval: 'three days', max: 60,  base: 3  }
gym   { interval: 'four days',  max: 70,  base: 4  }
salon { interval: 'five weeks', max: 180, base: 35 }
```

```js
ratio = days / base
score = clamp(round(log2(max(ratio, 0.5)) * 26 + 12), 2, 99)
```

Bands: `>=80 Critical` (terracotta) · `>=55 At risk` (`#C0632F`) · `>=32 Watch` (muted) ·
else `Healthy` (green). The dial is an SVG circle, `r=43`, `strokeDasharray` set to
`2πr * score/100`. The sentence beside it is the real output shape — if the production
copy generator changes, change it here too.

---

## 5. Content that must not drift

Figures quoted on the page and sourced from the current site: `$5,806` revenue at risk,
`21` days away, `$640` recovered, `~$970` per saved regular per year, `2 min` to first
risk list, `0` emails without approval, flagged at `day 8`. Pricing tiers are Starter /
Growth / Pro with the feature lists intact — **the monthly figures were removed at your
request**, so put them back before launch if that was temporary.

Compliance copy (CAN-SPAM / TCPA / HIPAA / deletion endpoint) is verbatim in intent from
the original page. Treat it as legal copy, not marketing copy.

---

## 6. Known gaps

- Waitlist form is local state only — `onSubmit` just flips the button label. Wire it to
  `POST /api/waitlist` as the original did.
- Desktop-first. Below ~1000px the four-up grids (stats, team, guardrails) and the
  two-column scroll sections need to collapse; the pinned scene should fall back to a
  static stacked list.
- `prefers-reduced-motion` currently only disables smooth scrolling. It should also skip
  the drift transforms and render both beats as static blocks.
- Riyan Anosh needs a photo.
