# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Vite, default port 5173)
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

No test runner or linter is configured.

## Architecture

Gel is a CSS/JS component library for macOS Aqua-inspired gel UI elements. No framework — vanilla JS and SCSS served by Vite.

### Core files

**`src/gel.scss`** — all component styles (compiled to CSS by Vite via sass). Structure:
1. `@property` declarations for animatable custom properties (`--gel-scale-x/y`, `--gel-highlight-x/y`, `--gel-specular-opacity`, `--gel-thumb-*`)
2. SCSS mixins: `gel-background()`, `gel-fill-background()`, `gel-track-background()`, `gel-shimmer-layer()`
3. `.gel, .gel-surface` — shared material layer (backdrop-filter, spring physics transform, specular opacity)
4. `.gel` — button/interactive surface: full gradient stack, border, shadow, text
5. `.gel-sm`, `.gel-lg` — size modifiers
6. Named components: `.gel-input-wrapper`, `.gel-slider`, `.gel-range`, `.gel-progress`, `.gel-checkbox`, `.gel-radio`
7. Color palette classes: `.gel-violet`, `.gel-ocean`, `.gel-moss`, `.gel-ruby`, `.gel-amber`
8. Light mode override: `[data-theme="light"]`

**`src/gel.js`** — three exported classes:
- `SpringValue` — single-axis Euler spring integrator used internally and exported
- `Gel` — attaches spring physics and pointer tracking to a `.gel` element. `Gel.initAll()` initialises all `.gel` AND `.gel-surface` elements (the latter with `keyboard: false`). Exposes `press()`, `release()`, `getInstance(el)`.
- `GelSlider` — custom range slider built on top of Gel. Queries `[data-gel-slider]`, handles pointer-capture drag and keyboard arrow/Home/End.

**`src/main.js`** — demo entry point. Calls `GelSlider.initAll()`, `Gel.initAll()`, `initTheme()`, `initGelCursor()`, `initGelRange()`.

**`src/style.css`** — demo scene only (blobs, hero, explore section, gel cursor, theme tokens). Not part of the gel component library.

### SCSS mixin system

The gradient layers are defined once as mixins and `@include`d into each component, eliminating duplication:

| Mixin | Layers | Used by |
|---|---|---|
| `gel-background()` | specular + gloss + rim + body + border (all `padding-box`/`border-box`) | `.gel`, `.gel-input-wrapper`, checkbox/radio boxes |
| `gel-fill-background()` | gloss + rim + body (no clips, no border) | `.gel-slider__fill`, `.gel-progress__fill` |
| `gel-track-background()` | gloss + rim + body (no clips) | fallback for pseudo-element contexts |
| `gel-shimmer-layer($dur, $delay)` | diagonal shimmer `::after` | `.gel::after`, fill `::after` |

**Important:** Do not use `gel-background()` inside `::webkit-slider-runnable-track` — CSS custom properties set inside that pseudo-element bleed into `::webkit-slider-thumb` in WebKit. Use hardcoded neutral values there instead.

### CSS variable system

All gradient colours are driven by custom properties on the element (via palette class or inline style):

| Variable | Default | Purpose |
|---|---|---|
| `--gel-hue` | `0` | Colour wheel position (base is neutral/clear) |
| `--gel-saturation` | `0%` | Colour intensity |
| `--gel-lightness` | `88%` | Body mid-stop lightness |
| `--gel-body-top` | `92%` | Top body gradient stop |
| `--gel-body-bot` | `92%` | Bottom body gradient stop |
| `--gel-body-alpha` | `0.28` | Body edge opacity (frosted glass transparency) |
| `--gel-body-alpha-mid` | `0.48` | Body centre opacity |
| `--gel-border-hue` | `var(--gel-hue)` | Border accent hue |
| `--gel-border-sat` | `var(--gel-saturation)` | Border accent saturation |
| `--gel-border-lightness-top` | `30%` | Border gradient top stop |
| `--gel-border-lightness-bot` | `40%` | Border gradient bottom stop |

Physics properties (`--gel-scale-x/y`, `--gel-highlight-x/y`, `--gel-specular-opacity`) are written by `gel.js` at runtime — never set them manually.

Range thumb physics properties (`--gel-thumb-scale-x/y`, `--gel-thumb-highlight-x/y`, `--gel-thumb-specular-opacity`) are written by `initGelRange()` in `main.js`.

### The `.gel` vs `.gel-surface` distinction

- `.gel` — full button treatment: gradient body, border, shadow, dark text, cursor pointer. Use for clickable elements.
- `.gel-surface` — shared material only (backdrop-filter, specular, transform). Add to non-button interactive surfaces (input wrappers, checkbox/radio boxes) so `Gel.initAll()` picks them up with `keyboard: false`.

### The base `.gel` is neutral

The default `.gel` with no palette class is neutral/clear (0% saturation, 88% lightness) — a frosted glass capsule. Palette classes inject hue and saturation to tint it. There is no `.gel-neutral` class; just use bare `.gel`.

### Gradient border technique

The 1px coloured border is `border: 1px solid transparent` with a `border-box` background layer (the last `linear-gradient` in the `background` stack). Pure CSS, no pseudo-elements.

### Light/dark mode

`data-theme="dark"` on `<html>` is the default. `main.js` switches it. CSS reads it via `[data-theme="light"]`. The library uses a single set of lightness/alpha tokens for both modes — the `backdrop-filter` naturally darkens or lightens the apparent surface based on the scene behind it. The only light mode override is a darker `border-top-color` for depth and slightly lighter input body values.

### Gel range (`gel-range`)

A native `<input type="range">` with gel-styled thumb and track:

```html
<input type="range" class="gel-range gel-ocean" min="0" max="100" value="65">
```

- Palette classes apply to the thumb. The track is always neutral (hardcoded neutral values in the track pseudo-element to prevent CSS var bleed).
- `initGelRange()` in `main.js` attaches spring squish, specular tracking, hover scale, and ricochet on leave — all driven by `--gel-thumb-*` CSS custom properties inherited by `::webkit-slider-thumb`.

### Gel cursor

`#gel-cursor` uses `class="gel"` to inherit the full gradient material. `initGelCursor()` in `main.js` animates position (underdamped X/Y springs), scale (click squish + hover-exit ricochet + stop jiggle), and manages visibility. The cursor hides over `.gel`, `input`, `button`, `.gel-checkbox`, `.gel-radio` elements.

### Checkbox/radio checked state

The unchecked box sets `--gel-hue: 0; --gel-saturation: 0%` directly on the element (neutral). The checked state rule uses `--gel-hue: inherit; --gel-saturation: inherit` to pull the tint from the parent palette class. Both states use `@include gel-background()` — no duplicated gradient code.

### Adding a new component

1. Add its CSS in `gel.scss` using `@include gel-background()` for the background layers.
2. Set the required CSS vars (`--gel-hue`, `--gel-saturation`, `--gel-border-hue`, `--gel-border-sat`) on the element before the `@include`.
3. If interactive, add `.gel-surface` so `Gel.initAll()` picks it up.
4. Apply a palette class rather than inline custom vars.
