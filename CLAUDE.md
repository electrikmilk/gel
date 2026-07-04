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
2. Theme tokens: `:root` sets `--gel-body-alpha`/`--gel-body-alpha-mid` (dark default)
3. SCSS mixins: `gel-background()`, `gel-fill-background()`, `gel-shimmer-layer()`, `gel-backdrop-filter()`, `gel-range-track-neutral-background()`, `gel-neutral-tint()`, `gel-raised-shadow()`, `gel-panel-shadow()`, `gel-fill-shine-shadow()`, `gel-focus-outline()`, `gel-toggle-wrapper()`, `gel-toggle-hidden-input()`, `gel-toggle-box()`, `gel-toggle-checked-tint()`
4. `.gel, .gel-surface` — shared material layer (backdrop-filter, spring physics transform, specular opacity)
5. `.gel` — reusable material: rounded-capsule shape, full gradient stack, border, raised shadow/glow, idle shimmer. No layout, cursor, or text styling
6. `.gel-button` — interactive-button chrome layered on top of `.gel`: flex content-centering, padding, text styling, cursor, keyboard focus
7. `.gel-sm`, `.gel-lg` — size modifiers (used with `.gel-button`)
8. Named components: `.gel-input-wrapper`, `.gel-slider`, `.gel-range`, `.gel-progress`, `.gel-checkbox`, `.gel-radio`
9. Color palette classes: `.gel-violet`, `.gel-ocean`, `.gel-moss`, `.gel-ruby`, `.gel-amber`
10. Light mode override: `[data-theme="light"]` (lowers body alpha to `0.15`, adjusts borders/input body)

**`src/gel.js`** — three exported classes:
- `SpringValue` — single-axis Euler spring integrator used internally and exported
- `Gel` — attaches spring physics and pointer tracking to a `.gel` element. `Gel.initAll()` initialises all `.gel` AND `.gel-surface` elements (the latter with `keyboard: false`). Exposes `press()`, `release()`, `getInstance(el)`.
- `GelSlider` — custom range slider built on top of Gel. Queries `[data-gel-slider]`, handles pointer-capture drag and keyboard arrow/Home/End.

**`src/main.js`** — demo entry point. Calls `GelSlider.initAll()`, `Gel.initAll()`, `initTheme()`, `initGelCursor()`, `initGelRange()`.

**`src/style.css`** — demo scene only (blobs, hero, explore section, gel cursor, theme tokens). Not part of the gel component library.

### SCSS mixin system

The gradient layers, backdrop filter, shadows, and toggle boilerplate are each defined once as mixins and `@include`d into every component, eliminating duplication:

| Mixin | Layers | Used by |
|---|---|---|
| `gel-background($highlight-x, $highlight-y, $specular-opacity)` | specular + gloss + rim + body + border (all `padding-box`/`border-box`) | `.gel`, `.gel-input-wrapper`, track/panel/checkbox/radio surfaces, range thumb (with `--gel-thumb-*` args) |
| `gel-fill-background($body-alpha, $body-alpha-mid)` | gloss + rim + body (no clips, no border, no specular) | `.gel-slider__fill` only (default `0.55`/`0.80`, fixed literal not the `--gel-body-alpha` theme token). A slider fill sits directly beside its thumb, which is fully saturated and reads as "the real color" by proximity, so the fill itself can afford to be a paler tint |
| `gel-shimmer-layer($dur, $delay)` | diagonal shimmer `::after` | `.gel::after`, fill `::after` |
| `gel-backdrop-filter()` | `backdrop-filter`/`-webkit-backdrop-filter` blur+saturate+brightness | every gel surface, including fills |
| `gel-range-track-neutral-background($body-alpha)` | same 4 layers as `gel-fill-background()` but with a literal (non-custom-property) body alpha | `.gel-range::-webkit-slider-runnable-track` only |
| `gel-neutral-tint()` | achromatic `--gel-hue/saturation/lightness/body-top/body-bot/border-hue/border-sat` defaults | `.gel`, `.gel-slider__track`, `.gel-range`, `.gel-progress`, toggle boxes |
| `gel-raised-shadow($glow-offset, $glow-blur)` | button-style inset + glow box-shadow | `.gel`, checkbox/radio boxes, range thumb (smaller glow args) |
| `gel-panel-shadow()` | flat inset + drop box-shadow | `.gel-slider__track`, `.gel-progress`, native range track |
| `gel-fill-shine-shadow($top-blur)` | subtle inset shine for fill bars | `.gel-slider__fill`, `.gel-progress__fill` |
| `gel-focus-outline()` | `:focus-visible` ring | `.gel`, slider thumb, range thumb |
| `gel-toggle-wrapper()` / `gel-toggle-hidden-input()` | label wrapper / visually-hidden input | `.gel-checkbox`, `.gel-radio` |
| `gel-toggle-box()` / `gel-toggle-checked-tint()` | unchecked box material / checked `inherit` tint | checkbox/radio boxes (caller still sets `border-radius`) |

**Important:** Do not use `gel-background()` inside `::webkit-slider-runnable-track` — CSS custom properties set inside that pseudo-element bleed into `::webkit-slider-thumb` in WebKit. Use `gel-range-track-neutral-background()` there instead (the runnable track still uses `gel-backdrop-filter()` and `gel-panel-shadow()`, which aren't custom-property-driven).

### CSS variable system

All gradient colours are driven by custom properties on the element (via palette class or inline style):

| Variable | Default | Purpose |
|---|---|---|
| `--gel-hue` | `0` | Colour wheel position (base is neutral/clear) |
| `--gel-saturation` | `0%` | Colour intensity |
| `--gel-lightness` | `88%` | Body mid-stop lightness |
| `--gel-body-top` | `92%` | Top body gradient stop |
| `--gel-body-bot` | `92%` | Bottom body gradient stop |
| `--gel-body-alpha` | `0.25` dark / `0.15` light | Body edge opacity (frosted glass transparency) — theme token, not palette-driven, see below. Not used by fills (`gel-fill-background()` hardcodes its own bolder alpha) or `.gel-input-wrapper` (hardcodes its own fixed `0.24`, independent of theme) |
| `--gel-body-alpha-mid` | `0.25` dark / `0.15` light | Body centre opacity — theme token, not palette-driven, see below. Not used by fills or `.gel-input-wrapper` (hardcodes its own fixed `0.40`) |
| `--gel-border-hue` | `var(--gel-hue)` | Border accent hue |
| `--gel-border-sat` | `var(--gel-saturation)` | Border accent saturation |
| `--gel-border-lightness-top` | `30%` | Border gradient top stop |
| `--gel-border-lightness-bot` | `40%` | Border gradient bottom stop |

Physics properties (`--gel-scale-x/y`, `--gel-highlight-x/y`, `--gel-specular-opacity`) are written by `gel.js` at runtime — never set them manually.

Range thumb physics properties (`--gel-thumb-scale-x/y`, `--gel-thumb-highlight-x/y`, `--gel-thumb-specular-opacity`) are written by `initGelRange()` in `main.js`.

### `.gel` vs `.gel-button` vs `.gel-surface`

- `.gel` — the material only: rounded-capsule shape, gradient body, border, raised shadow/glow, idle shimmer. No layout, cursor, or text styling — it's meant to be usable on *any* element, interactive or not (a button, a progress fill, a decorative capsule like the hero wordmark).
- `.gel-button` — interactive-button chrome, layered on top with `class="gel gel-button"`: flex content-centering, padding, text color/shadow, `cursor: pointer`, `:focus-visible` ring. Use for actual clickable buttons/links.
- `.gel-surface` — shared material only (backdrop-filter, specular, transform) *without* the full `gel-background()`/border/shadow stack `.gel` has. Add to non-button interactive surfaces (input wrappers, checkbox/radio boxes) so `Gel.initAll()` picks them up with `keyboard: false`; those components build their own visuals via mixins directly rather than the `.gel` class.

A non-interactive material user (e.g. `.gel-progress__fill`) applies bare `.gel` and gets the full look without any button baggage to override. Don't add `.gel-button` to something that isn't genuinely clickable — its `cursor: pointer` and focus ring imply interactivity.

### The base `.gel` is neutral

The default `.gel` with no palette class is neutral/clear (0% saturation, 88% lightness) — a frosted glass capsule. Palette classes inject hue and saturation to tint it. There is no `.gel-neutral` class; just use bare `.gel`.

### Gradient border technique

The 1px coloured border is `border: 1px solid transparent` with a `border-box` background layer (the last `linear-gradient` in the `background` stack). Pure CSS, no pseudo-elements.

### Light/dark mode

`data-theme="dark"` on `<html>` is the default. `main.js` switches it. CSS reads it via `[data-theme="light"]`. The library uses a single set of lightness tokens for both modes — the `backdrop-filter` naturally darkens or lightens the apparent surface based on the scene behind it. `--gel-body-alpha`/`--gel-body-alpha-mid` are the one theme-driven exception: dark scenes need a more opaque body (`0.25`, set at `:root` in the "Theme tokens" section) to stay legible, light scenes read fine at `0.15` (overridden in `[data-theme="light"]`). Because custom properties inherit, no palette class or component needs to set these itself — except `.gel-input-wrapper`, which hardcodes its own fixed `0.24`/`0.40` regardless of theme (an input's body needs to stay legible in both modes, unlike the frosted-glass look elsewhere). The native range track can't read the custom property (WebKit bleed), so its light-mode alpha is set directly via `gel-range-track-neutral-background(0.15)`. Besides alpha, the only other light mode overrides are a darker `border-top-color` for depth and slightly lighter input body values.

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

The unchecked box uses `gel-toggle-box()`, which includes `gel-neutral-tint()` to set `--gel-hue: 0; --gel-saturation: 0%` (etc.) directly on the element. The checked state rule uses `gel-toggle-checked-tint()`, which sets `--gel-hue: inherit; --gel-saturation: inherit` (etc.) to pull the tint from the parent palette class. Both states end with `@include gel-background()` — no duplicated gradient code.

### Adding a new component

1. If it just needs the material look (no button semantics), apply the `.gel` class directly rather than re-including its mixins — see `.gel-progress__fill` for an example (`class="gel-progress__fill gel gel-violet"`). Otherwise, add its CSS in `gel.scss` using `@include gel-background()` for the background layers.
2. Set the required CSS vars (`--gel-hue`, `--gel-saturation`, `--gel-border-hue`, `--gel-border-sat`) on the element before the `@include` (not needed if reusing `.gel` — it already sets neutral defaults via `gel-neutral-tint()`).
3. If it's a real clickable button, add `.gel-button` alongside `.gel` for the layout/cursor/text chrome. If it's a non-button interactive surface (input wrapper, checkbox/radio box), add `.gel-surface` instead so `Gel.initAll()` picks it up with `keyboard: false`.
4. Apply a palette class rather than inline custom vars.
