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

Gel is a CSS/JS component library for macOS Aqua-inspired gel UI elements. There is no framework — it is vanilla JS and CSS served by Vite.

### Core files

**`src/gel.css`** — all component styles. Structure:
1. `@property` declarations for animatable custom properties (`--gel-scale-x/y`, `--gel-highlight-x/y`, `--gel-specular-opacity`)
2. `.gel, .gel-surface` — shared material layer (backdrop-filter, spring physics transform, specular opacity)
3. `.gel` — button/interactive surface: full gradient stack, border, shadow, text
4. Named components: `.gel-input-wrapper`, `.gel-slider`, `.gel-progress`, `.gel-checkbox`, `.gel-radio`
5. Color palette classes: `.gel-violet`, `.gel-ocean`, `.gel-moss`, `.gel-ruby`, `.gel-amber`, `.gel-neutral`
6. Theme overrides: `[data-theme="dark"] .gel` and `[data-theme="light"] .gel`

**`src/gel.js`** — three exported classes:
- `SpringValue` — single-axis Euler spring integrator used internally
- `Gel` — attaches spring physics and pointer tracking to a `.gel` element. `Gel.initAll()` initialises all `.gel` AND `.gel-surface` elements (the latter with `keyboard: false` so bubbled input key events don't trigger squish). Exposes `press()`, `release()`, `getInstance(el)` for programmatic control.
- `GelSlider` — custom range slider built on top of Gel. Queries `[data-gel-slider]`, handles pointer capture drag, keyboard arrow/Home/End, and calls `Gel.getInstance()` on the thumb to trigger squish on keyboard interaction.

**`src/main.js`** — entry point. Calls `GelSlider.initAll()` then `Gel.initAll()`, and `initTheme()` which reads `localStorage` / `prefers-color-scheme`, sets `document.documentElement.dataset.theme`, and wires the `#theme-toggle` button.

**`src/style.css`** — demo scene only (blobs, layout, theme CSS variables). Not part of the gel component library.

### CSS variable system

All gradient colours are driven by a small set of custom properties set on each element (via color classes or inline style):

| Variable | Default | Purpose |
|---|---|---|
| `--gel-hue` | 280 | Colour wheel position |
| `--gel-saturation` | 75% | Colour intensity |
| `--gel-lightness` | 67% | Body mid-stop lightness |
| `--gel-body-top` | 60% | Top body gradient stop lightness |
| `--gel-body-bot` | 84% | Bottom body gradient stop lightness |
| `--gel-border-hue` | `var(--gel-hue)` | Border accent hue (Ocean uses indigo 257°) |
| `--gel-border-sat` | `var(--gel-saturation)` | Border accent saturation |

The physics properties (`--gel-scale-x/y`, `--gel-highlight-x/y`, `--gel-specular-opacity`) are written by `gel.js` at runtime — never set them manually.

### The `.gel` vs `.gel-surface` distinction

- `.gel` — full button treatment: gradient body, border, shadow, text colour, cursor pointer. Use for clickable elements.
- `.gel-surface` — shared material only (backdrop-filter, specular, transform). Add to non-button interactive surfaces (input wrappers, checkbox/radio boxes) so `Gel.initAll()` picks them up with `keyboard: false`.

### Gradient border technique

The 1px coloured border is achieved via `border: 1px solid transparent` + a `border-box` background layer (the last `linear-gradient` in the `background` stack). Pure CSS — no pseudo-elements.

### Light/dark mode

`data-theme="dark"` on `<html>` is the default. The JS in `main.js` switches it; CSS reads it via `[data-theme="light"]` and `[data-theme="dark"]` selectors. Dark mode uses `--gel-lightness: 48%` (darker body, white text readable). Light mode uses `--gel-lightness: 72% !important` (lighter pastel, black text). The `!important` is intentional — it must beat inline `--gel-lightness` overrides set for dark mode on specific elements.

### Adding a new component

1. Add its CSS in `gel.css` using the same gradient layers as `.gel-input-wrapper` or `.gel-checkbox__box` as a reference.
2. If it is interactive, add `.gel-surface` to its HTML element so `Gel.initAll()` picks it up.
3. Apply a color palette class (`.gel-violet` etc.) rather than inline custom vars.
