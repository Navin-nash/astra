# Design System: Astra
**Project:** Astra — GitHub as a Portfolio

---

## 1. Visual Theme & Atmosphere

Astra occupies a confident middle ground between editorial minimalism and technical precision. The interface feels **clean, purposeful, and quietly premium** — light mode reads as a crisp white canvas with warm undertones and a single punchy orange brand accent; dark mode transforms into a deep indigo-black void with a cool cyan brand accent, evoking the feel of looking at code in a terminal after midnight.

Both modes share the same spatial philosophy: generous whitespace, disciplined typographic hierarchy, and a deliberate avoidance of decorative noise. Surfaces are almost invisible — borders are whisper-soft, shadows are absent in favour of subtle rings, and cards float against their backgrounds with barely perceptible depth. The design trusts typography and spacing to communicate hierarchy, not decoration.

The overall mood: **restrained confidence**. Every element earns its place.

---

## 2. Color Palette & Roles

### Light Mode

| Descriptive Name | Value | Role |
|---|---|---|
| Pure Canvas White | `oklch(1 0 0)` · `#FFFFFF` | Page background |
| Warm Near-Black | `oklch(0.09 0 0)` · `#161616` | Body text, primary foreground, default button fill |
| Frost White | `oklch(0.99 0.002 90)` · `#FAFAF9` | Card surfaces, elevated containers |
| Soft Warm Gray | `oklch(0.96 0.003 90)` · `#F4F3F0` | Secondary buttons, muted backgrounds, hover states |
| Warm Pebble | `oklch(0.48 0.01 90)` · `#787771` | Supporting text, placeholder text, card descriptions |
| Linen Border | `oklch(0.88 0.005 90)` · `#E0DDD8` | Dividers, input strokes, card rings |
| Ember Orange *(brand)* | `oklch(0.65 0.20 47)` · `#C86920` | Primary brand accent — CTAs, highlights, active states, selection |
| Peach Blush *(brand muted)* | `oklch(0.96 0.05 47)` · `#F6EDE6` | Brand tints, tag backgrounds, hover glows |
| Alarm Red | `oklch(0.577 0.245 27.325)` · `#D93A1A` | Destructive actions, error states |

### Dark Mode

| Descriptive Name | Value | Role |
|---|---|---|
| Void Black | `oklch(0.09 0 0)` · `#161616` | Page background — pure neutral near-black |
| Ghost White | `oklch(0.97 0 0)` · `#F7F7F7` | Primary foreground text |
| Charcoal | `oklch(0.13 0 0)` · `#202020` | Card and popover surfaces |
| Smoke | `oklch(0.18 0 0)` · `#2C2C2C` | Secondary, muted, and accent backgrounds; hover fills |
| Ash Gray | `oklch(0.62 0 0)` · `#979797` | Muted foreground text, placeholders |
| Veil White | `oklch(1 0 0 / 10%)` | Borders and input strokes — translucent white overlay |
| Ember Orange *(brand)* | `oklch(0.72 0.18 47)` · `#D97020` | Primary brand accent — same hue as light mode, brighter for dark contrast |
| Burnt Mist *(brand muted)* | `oklch(0.18 0.05 47)` · `#2E1A0E` | Brand tints on dark surfaces |
| Coral Alarm | `oklch(0.704 0.191 22.216)` · `#F05E3A` | Destructive actions in dark mode |

---

## 3. Typography Rules

**Primary Typeface — Satoshi Variable**
A geometric sans-serif with warmth. Loaded locally as a variable font (`Satoshi-Variable.woff2`), spanning weights 300–900. Used for all UI text: headings, body, labels, buttons, and navigation. Its variable nature allows fine-tuned weight steps without swapping font files.

**Monospace — Geist Mono** (Google Fonts)
Used exclusively for code snippets, technical labels, and keyboard shortcuts. Crisp and legible at small sizes.

**Weight usage:**
- `300–400 (Light/Regular)` — Body copy, descriptions, supporting text
- `500 (Medium)` — UI labels, card titles, navigation items
- `600–700 (SemiBold/Bold)` — Section headings, primary CTAs, emphasis
- `800–900 (ExtraBold/Black)` — Hero headlines, large display text only

**Letter-spacing:** Default tracking for body; headings may use slight negative tracking (`-0.01em` to `-0.02em`) for a tighter, editorial feel. Avoid wide-tracked all-caps except for very small eyebrow labels.

**Scale anchors:**
- `text-xs` (0.75rem) — Badges, keyboard hints, fine print
- `text-sm` (0.875rem) — Body, button labels, table cells
- `text-base` (1rem) — Card titles, form labels
- Larger display sizes — Section and hero headings, Satoshi ExtraBold/Black

---

## 4. Component Stylings

**Buttons**
Sizes come in four heights: xs (24px), sm (28px), default (32px), lg (36px), plus matching icon-only squares. Corners are **subtly rounded** (`rounded-lg`, ~8px). The default variant is a solid near-black fill with white text — bold and direct. Outline buttons are transparent with a linen border, turning soft warm gray on hover. Ghost buttons are invisible until hovered. Transitions are quick (`transition-all`) with a 1px downward press on active. Focus rings are a 3px amber-tinted brand ring.

**Badges / Chips**
Fully pill-shaped (`rounded-4xl`). 20px tall. Tight horizontal padding. Used for status labels, technology tags, and metadata. Default variant mirrors button default (near-black fill). Secondary is soft warm gray. Outline variant uses a linen border with neutral text.

**Cards / Containers**
Generously rounded corners (`rounded-xl`, ~14px). Background is Frost White in light mode, Charcoal Indigo in dark. A single `ring-1 ring-foreground/10` replaces traditional box shadows — creating a delicate edge definition without any lift or blur. No drop shadows. Inner content respects 16px horizontal padding (12px in small cards). Card footers use a muted background tint and a top border to delineate action areas.

**Inputs / Forms**
Height 32px, same as the default button. Corners `rounded-lg`. Border is Linen Border color, thickening to the brand ring on focus with a 3px ambient glow. Background is transparent in light mode, semi-transparent input fill in dark mode (`bg-input/30`). Placeholder text uses the Warm Pebble muted color. Disabled state reduces opacity to 50% and switches cursor.

**Tooltips / Popovers**
Use Frost White / Charcoal Indigo surfaces, inheriting the same ring-based border treatment as cards.

---

## 5. Layout Principles

**Whitespace-first spacing.** Sections breathe with generous vertical rhythm: the `.section-pad` utility applies `py-20` (80px) on mobile, scaling to `py-28` (112px) on large screens. Internal component spacing favors `gap-4` (16px) in cards and `gap-1.5` (6px) in button internals.

**Single-column content spine.** The hero and main sections center their content on a constrained max-width column, with generous horizontal padding on smaller viewports. This focuses reading attention and lets the background show as deliberate negative space.

**Dot-grid texture.** A subtle radial-gradient dot pattern (`background-size: 28px 28px`) can be applied as a background layer on hero sections. The dots are `foreground 8%` opacity — barely perceptible, adding depth without distraction.

**Consistent border radius scale.** The base radius is `0.625rem` (10px). All tiers derive from this anchor:

| Token | Multiplier | Result | Use |
|---|---|---|---|
| `--radius-sm` | ×0.6 | ~6px | Tight small elements |
| `--radius-md` | ×0.8 | ~8px | Buttons, inputs |
| `--radius-lg` | ×1 | 10px | Default containers |
| `--radius-xl` | ×1.4 | ~14px | Cards |
| `--radius-2xl` | ×1.8 | ~18px | Modals, sheets |
| `--radius-3xl` | ×2.2 | ~22px | Large decorative panels |
| `--radius-4xl` | ×2.6 | ~26px | Badges, pill shapes |

**Theme transitions.** The view-transition API is wired for animated theme switching (via `::view-transition-old/new(root)`), preserving the brand's premium feel even during mode changes.
