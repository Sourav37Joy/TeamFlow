# Brand Reference: niftycoders.com

**Extracted**: 2026-08-28 | **Source**: `https://www.niftycoders.com/` | **Feature**: [spec.md](./spec.md)

This file is the single source of truth for every brand fact this feature depends on. The specification refers to colours by their **role name**; this file maps each role to its exact value and records the evidence for it. If a value here is wrong, the fix belongs here and nowhere else.

## How these values were obtained

The site is a Next.js application styled with **styled-components**, so the server-rendered HTML contains only the loading shell and the published stylesheet (`/_next/static/css/cbc2713a0489491b.css`, 3.4 KB) carries nothing but the CSS reset and `@font-face` declarations. Every colour, radius, shadow, and transition lives inside the JavaScript chunks.

Ten chunks totalling ~588 KB were downloaded and mined for CSS literals. Roles below were assigned from **usage frequency and declaration context** (whether a value appears as `color:`, `background:`, or `border:`), not from guesswork. Occurrence counts are quoted so any claim here can be re-checked.

## Colour roles

### Core

| Role | Value | Occurrences | Evidence |
|------|-------|-------------|----------|
| **Brand ink** — all primary text, headings, strong UI | `#141F40` | 123 | 116× as `color:`; also `border-left: 2px solid #141f40` and the selected state in `selected ? "#141F40" : "#bebebe"` |
| **Interactive accent** — links, active nav, primary action | `#0145FE` | 9 | `color:`, `background:`, `border: 1px solid #0145fe`, and the active branch of `t ? "#0145FE" : "#141f40"` |
| **Accent pressed** — the darker step under the accent | `#003EE5` | 1 | Paired with the accent as its deeper variant |
| **Surface tint** — section and panel backgrounds | `#F0F5F9` | 19 | 12× as `background:`; also the terminus of the page wash gradient |
| **Panel** — cards and raised surfaces | `#FFFFFF` | 50 | Dominant surface colour throughout |
| **Hairline** — every 1px divider and card edge | `#E2E9EF` | 4 | Appears **only** as `border: 1px solid #e2e9ef` — an unambiguous role |
| **Muted** — inactive, secondary, disabled text | `#BEBEBE` | 4 | The unselected branch of `selected ? "#141F40" : "#bebebe"` |
| **Near-black** — deepest gradient stop | `#000003` | 9 | Terminus of the bold accent gradient |

### Supporting

| Role | Value | Occurrences | Notes |
|------|-------|-------------|-------|
| Gradient blue | `#0C65F1` | 9 | Opening stop of the bold accent gradient |
| Deep navy | `#091F5B` | 2 | Darker brand navy |
| Deep teal | `#052B42` | 3 | Darkest brand tone |
| Cyan bright | `#44E6FE` | 2 | Highlight cyan |
| Cyan soft | `#26E0FC` | 1 | Secondary highlight cyan |

### Semantic

| Role | Value | Occurrences |
|------|-------|-------------|
| Success | `#2AAE49` | 1 |
| Danger | `#E30707` | 1 |

The brand publishes no amber. A warning tone must be derived rather than quoted — see [spec.md](./spec.md), FR-118.

### Tints (gradient stops)

`#CCDAFC` · `#DEF9FF` · `#D8F5FE` · `#C2D7FF` · `#B1C9F8` · `#EFF5FF`

These six appear exclusively as gradient endpoints, never as flat fills. They are the correct source for soft status washes.

### Neutrals

`#666666` · `#A6A6A6` · `#AAAAAA` · `#D9D9D9` · `#D9E1E8` · `#EAEBEC` · `#F2F2F2` · `#373A47` · `#181A1E`

## Gradients

Quoted verbatim from the chunks:

```css
linear-gradient(180deg, #fff 0%, #f0f5f9 100%)              /* page and hero wash */
linear-gradient(270deg, #0c65f1 -2.84%, #000003 111.23%)    /* bold accent */
linear-gradient(270deg, #CCDAFC 0%, #DEF9FF 100%)           /* soft tint A */
linear-gradient(270deg, #D8F5FE 0%, #C2D7FF 100%)           /* soft tint B */
linear-gradient(270deg, #EFF5FF 0%, #B1C9F8 100%)           /* soft tint C */
```

Note the deliberately out-of-range stops (`-2.84%`, `111.23%`) on the bold accent — the gradient is sampled from the middle of a wider ramp, which is what keeps it from reading as a flat two-colour blend. Reproduce those percentages exactly.

## Radii

| Value | Occurrences | Role |
|-------|-------------|------|
| `20px` | 16 | **Dominant** — cards and panels |
| `30px` | 9 | Large surfaces and feature blocks |
| `50%` | 7 | Avatars and circular controls |
| `15px` / `16px` | 4 | Small controls, inputs, chips |
| `48px` | 2 | Full pills |
| `24px` / `26px` / `28px` | 3 | Intermediate blocks |

The brand's radius language is noticeably rounder than the current product's 6–12px. Adopting `20px` for cards is the single change that most shifts the product toward the brand.

## Shadows

```css
box-shadow: 0px 0px 50px 0px rgba(0, 0, 0, 0.05);      /* ambient card lift */
box-shadow: 0px 4px 25px 0px rgba(24, 26, 30, 0.4);    /* elevated / overlay */
box-shadow: 0 0 0 3px rgba(20, 31, 64, 0.5);           /* focus ring - brand ink at 50% */
```

The ambient shadow is wide (50px blur) and very light (5% alpha) with **zero offset** — a diffuse halo rather than a drop shadow. The focus ring is brand ink at half alpha, which is the accessible focus treatment this feature must carry across every control.

## Typography

Two families, both self-hosted with `font-display: swap`:

| Family | Weights published | Role |
|--------|-------------------|------|
| **Inter** | 100–900 (all nine) | Body, UI, default on `body`/`html` |
| **IBM Plex Sans** | 100–700 | Applied via a `.plexsans` class — display and accent text |

```css
body, html { font-family: var(--font-inter); }
.plexsans  { font-family: var(--font-plexsans); }
```

Fallback metrics are overridden against Arial (`ascent-override: 90.00%`, `descent-override: 22.43%`, `size-adjust: 107.64%` for Inter), which is how the site avoids reflow while the webfont loads.

## Motion

| Declaration | Occurrences |
|-------------|-------------|
| `transition: background-color 0.3s` | 5 |
| `transition: transform 0.3s ease` | 3 |
| `transition: opacity 0.5s ease-in-out` | 4 |
| `transition: transform 0.5s ease` | 4 |
| `transition: transform 0.8s ease` | 4 |
| `transition: transform 1s ease` | 4 |
| `transition: left 0.3s ease` | 1 |
| `transition: all 0.3s` | 1 |

**`0.3s ease` is the brand's interaction tempo.** Longer durations (0.5s–1.3s) are reserved for scroll-driven and decorative movement, which this product does not need.

## Global rules

```css
* { box-sizing: border-box; padding: 0; margin: 0; scroll-behavior: smooth; }
html { overflow-y: scroll; }
```

`scroll-behavior: smooth` and a permanently reserved scrollbar gutter (`overflow-y: scroll`) are both brand-level decisions — the second eliminates the horizontal jump when a short page becomes a tall one, which directly serves this feature's smoothness goal.

## Divergences from the brand, and why

Reconciled against `src/web/app/tokens.css` on 2026-08-29. Three brand values could not be used
as published, and one tone had to be invented. Every other value is transcribed exactly.

Contrast was measured with WCAG 2.1 relative luminance. The threshold for small text is 4.5:1.

| Brand value | Measured | Problem | Substitute | Measured |
|---|---|---|---|---|
| `#BEBEBE` muted | **1.86** on white | Fails badly. Unreadable as body or secondary text | `#666666` — the brand's own neutral | 5.74 on panel, 5.23 on surface |
| `#2AAE49` success | **2.90** on white | Fails for small text | `#1D7A33` — the same green darkened to 70% | 5.41 on panel, 5.01 on its tint |
| `#E30707` danger | 4.88 on white (passes) | Fails at **4.09** on its own light tint | `#C10606` for text on tint; `#E30707` kept for solid fills, where white on it measures 4.88 | 6.37 on panel, 5.54 on its tint |

`--brand-muted` and `--brand-success` are still defined and still used — for borders, disabled
fills, and decorative work, where contrast does not apply. Only their *text* role is substituted,
which is exactly what FR-114 asks for.

### The invented amber

The brand publishes no warning tone. `--warning-base: #A36115` was derived, not chosen:

- Hue taken midway between `--brand-danger` (H 0°) and `--brand-success` (H 134°) along the warm
  arc, landing at **H 32°**.
- Saturation is the mean of those two brand colours: **78%**.
- Lightness lowered to **36%** so it clears 4.5:1 — it measures **4.91** on panel.

An RGB midpoint of the two was tried first and produced `#865A28`, a muddy brown that read as a
mistake rather than a warning. The HSL derivation keeps the tone anchored to brand values while
still being recognisably amber, and stays distinguishable from both green and red as FR-118
requires.

### Where the tints came from

`--tint-success`, `--tint-warning`, `--tint-danger`, and `--tint-neutral` are each their base
colour mixed 90–92% toward white, and their `--edge-*` borders are the same base at 72%. These
are derived rather than quoted because the brand's own six tints are all blue and cyan, which
cannot carry a five-step status scale — every step would look like every other.

## Verification

Re-run the extraction with:

```powershell
$html = (Invoke-WebRequest "https://www.niftycoders.com/" -UseBasicParsing).Content
[regex]::Matches($html, '(?:href|src)="([^"]+\.js)"') | ForEach-Object { $_.Groups[1].Value }
# then download each chunk and:
[regex]::Matches($js, '#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b') |
  Group-Object | Sort-Object Count -Descending
```

Asset hashes change on every deploy of the brand site, so the chunk filenames above will go stale. The colour roles will not.
