# Gel

Aqua-inspired frosted glass UI components with spring physics. Translucent surfaces, underdamped spring interactions, and gradient layers faithful to the OS X aesthetic — composable CSS + JS, no framework required.

## Demo

```bash
npm install
npm run dev
```

## Components

| Element | Class | Notes |
|---|---|---|
| Button / link | `.gel` | Full interactive surface |
| Input | `.gel-input-wrapper` + `.gel-surface` | Wraps a `.gel-input` |
| Range slider | `.gel-range` | Native `input[type=range]`, JS-enhanced |
| Slider | `[data-gel-slider]` | Custom slider with fill and spring thumb |
| Progress | `.gel-progress` | Static progress bar |
| Checkbox | `.gel-checkbox` | Label wrapper + `.gel-checkbox__box.gel-surface` |
| Radio | `.gel-radio` | Label wrapper + `.gel-radio__box.gel-surface` |

## Color palette classes

Apply any of these to a gel element to tint it:

```html
<button class="gel gel-ocean">OK</button>
<button class="gel gel-ruby">Delete</button>
<button class="gel gel-moss">Save</button>
<button class="gel gel-violet">Violet</button>
<button class="gel gel-amber">Amber</button>
```

Omitting a palette class leaves the element as neutral frosted glass.

## Size modifiers

```html
<button class="gel gel-sm">Small</button>
<button class="gel gel-lg">Large</button>
```

## CSS custom properties

All gel elements are driven by a small set of custom properties. Override them inline or via a custom palette class:

| Variable | Default | Purpose |
|---|---|---|
| `--gel-hue` | `0` | Color wheel position (0–360) |
| `--gel-saturation` | `0%` | Color intensity |
| `--gel-lightness` | `88%` | Body mid-stop lightness |
| `--gel-body-top` | `92%` | Top body gradient stop |
| `--gel-body-bot` | `92%` | Bottom body gradient stop |
| `--gel-body-alpha` | `0.28` | Body edge opacity (frosted glass) |
| `--gel-body-alpha-mid` | `0.48` | Body center opacity |
| `--gel-border-hue` | `var(--gel-hue)` | Border accent hue |
| `--gel-border-sat` | `var(--gel-saturation)` | Border accent saturation |
| `--gel-border-lightness-top` | `30%` | Border gradient top lightness |
| `--gel-border-lightness-bot` | `40%` | Border gradient bottom lightness |

Physics properties (`--gel-scale-x/y`, `--gel-highlight-x/y`, `--gel-specular-opacity`) are written by `gel.js` at runtime — do not set them manually.

## Custom palette class

```css
.gel-cobalt {
  --gel-hue: 225;
  --gel-saturation: 90%;
  --gel-lightness: 59%;
  --gel-body-top: 76%;
  --gel-body-bot: 75%;
  --gel-body-alpha: 0.50;
  --gel-body-alpha-mid: 0.70;
}
```

## Light / dark mode

`data-theme="dark"` on `<html>` is the default. Toggle it to switch:

```js
document.documentElement.dataset.theme = 'light';
```

## JavaScript API

### `Gel.initAll()`

Attaches spring physics and pointer tracking to every `.gel` and `.gel-surface` element on the page. Call once after DOM ready.

```js
import { Gel, GelSlider, SpringValue } from './src/gel.js';

document.addEventListener('DOMContentLoaded', () => {
  GelSlider.initAll();
  Gel.initAll();
});
```

### `Gel` class

```js
const instance = new Gel(element, { keyboard: true });

instance.press();           // trigger squish programmatically
instance.release();         // release
Gel.getInstance(element);   // retrieve an existing Gel instance
```

### `GelSlider.initAll()`

Initialises all `[data-gel-slider]` elements with pointer-capture drag, keyboard arrow/Home/End handling, and spring squish on the thumb.

### `SpringValue`

Single-axis Euler spring integrator used internally, also exported for custom animations:

```js
const spring = new SpringValue({ stiffness: 200, damping: 20, value: 0 });
spring.setTarget(100);
spring.step(deltaTime);   // advance by dt seconds
spring.isSettled();       // true when at rest
```

**Tuning guide:**

| ζ (damping ratio) | Feel |
|---|---|
| < 1 | Underdamped — oscillates / giggles |
| = 1 | Critically damped — fastest, no overshoot |
| > 1 | Overdamped — slow, no oscillation |

`ζ = damping / (2 × √(stiffness × mass))`

## Project structure

```
src/
  gel.scss   — all component styles (SCSS, single source of truth)
  gel.js     — SpringValue, Gel, GelSlider classes
  main.js    — demo entry point; initTheme, initGelCursor, initGelRange
  style.css  — demo scene only (blobs, hero, layout)
```

## Build

```bash
npm run build    # production build → dist/
npm run preview  # serve the production build
```
