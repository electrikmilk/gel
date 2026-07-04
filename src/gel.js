/**
 * Spring physics integrator. Euler-method, single axis.
 *
 * Tuning guide:
 *   stiffness — higher = snappier response (faster to reach target)
 *   damping   — higher = less oscillation (ζ = damping / (2 * sqrt(stiffness * mass)))
 *               ζ < 1 = underdamped (oscillates/"giggles")
 *               ζ = 1 = critically damped (fastest no-overshoot)
 *               ζ > 1 = overdamped (slow, no oscillation)
 */
class SpringValue {
    #stiffness;
    #damping;
    #mass;

    value;
    velocity;
    target;

    constructor({value = 0, stiffness = 180, damping = 18, mass = 1} = {}) {
        this.#stiffness = stiffness;
        this.#damping = damping;
        this.#mass = mass;
        this.value = value;
        this.velocity = 0;
        this.target = value;
    }

    setTarget(target) {
        this.target = target;
    }

    step(deltaTime) {
        const force = -this.#stiffness * (this.value - this.target) - this.#damping * this.velocity;
        this.velocity += (force / this.#mass) * deltaTime;
        this.value += this.velocity * deltaTime;
    }

    isSettled(threshold = 0.0005) {
        return Math.abs(this.value - this.target) < threshold && Math.abs(this.velocity) < threshold;
    }
}

/**
 * Attaches spring physics and pointer tracking to a .gel element.
 *
 * Spring tuning:
 *   hoverScale — stiffness 260, damping 7  → ζ ≈ 0.22 (strongly underdamped, ~3 ricochets on enter/leave)
 *   squishY    — stiffness 300, damping 9  → ζ ≈ 0.26 (underdamped, snap + ricochet on press)
 *   highlight  — stiffness 80,  damping 18 → ζ ≈ 1.0  (critically damped, smooth specular glide)
 *
 * hoverScale and squishY combine multiplicatively so hover-raised and press-squished
 * states compose naturally without fighting each other.
 */
class Gel {
    static #instances = new WeakMap();

    #el;
    #keyboard;
    #hoverScale;
    #squishY;
    #highlightX;
    #highlightY;
    #rafId = null;
    #lastTimestamp = null;

    static initAll(root = document) {
        root.querySelectorAll('.gel').forEach(el => {
            if (!Gel.#instances.has(el)) {
                Gel.#instances.set(el, new Gel(el));
            }
        });
        // keyboard: false — key events bubble from child inputs and must not trigger squish
        root.querySelectorAll('.gel-surface').forEach(el => {
            if (!Gel.#instances.has(el)) {
                Gel.#instances.set(el, new Gel(el, {keyboard: false}));
            }
        });
    }

    constructor(el, {keyboard = true} = {}) {
        this.#el = el;
        this.#keyboard = keyboard;
        this.#hoverScale = new SpringValue({value: 1, stiffness: 200, damping: 7, mass: 1});
        this.#squishY = new SpringValue({value: 1, stiffness: 300, damping: 9, mass: 1});
        this.#highlightX = new SpringValue({value: 50, stiffness: 80, damping: 18, mass: 1});
        this.#highlightY = new SpringValue({value: 22, stiffness: 80, damping: 18, mass: 1});
        this.#attachListeners();
    }

    #attachListeners() {
        const el = this.#el;
        el.addEventListener('mouseenter', this.#onMouseEnter);
        el.addEventListener('mousemove', this.#onMouseMove);
        el.addEventListener('mouseleave', this.#onMouseLeave);
        el.addEventListener('mousedown', this.#onPress);
        el.addEventListener('mouseup', this.#onRelease);
        el.addEventListener('touchstart', this.#onPress, {passive: true});
        el.addEventListener('touchend', this.#onRelease, {passive: true});
        if (this.#keyboard) {
            el.addEventListener('keydown', this.#onKeyDown);
            el.addEventListener('keyup', this.#onKeyUp);
        }
    }

    #onMouseEnter = () => {
        this.#hoverScale.setTarget(1.04);
        this.#startLoop();
    };

    #onMouseMove = (event) => {
        const rect = this.#el.getBoundingClientRect();
        const relativeX = ((event.clientX - rect.left) / rect.width) * 100;
        const relativeY = ((event.clientY - rect.top) / rect.height) * 100;
        this.#highlightX.setTarget(relativeX);
        // Compress Y so the specular stays in the upper portion of the surface
        this.#highlightY.setTarget(relativeY * 0.55 + 5);
        this.#startLoop();
    };

    #onMouseLeave = () => {
        this.#hoverScale.setTarget(1);
        this.#highlightX.setTarget(50);
        this.#highlightY.setTarget(22);
        // Release any held press if mouse leaves while button is down
        this.#squishY.setTarget(1);
        this.#startLoop();
    };

    #onPress = () => {
        this.#squishY.setTarget(0.88);
        this.#startLoop();
    };

    #onRelease = () => {
        this.#squishY.setTarget(1);
        this.#startLoop();
    };

    #onKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') this.#onPress();
    };

    #onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') this.#onRelease();
    };

    #startLoop() {
        if (this.#rafId !== null) return;
        this.#lastTimestamp = null;
        this.#rafId = requestAnimationFrame(this.#animationLoop);
    }

    #animationLoop = (timestamp) => {
        if (this.#lastTimestamp === null) this.#lastTimestamp = timestamp;

        // Cap deltaTime to 50ms to avoid large physics jumps after tab switches
        const deltaTime = Math.min((timestamp - this.#lastTimestamp) / 1000, 0.05);
        this.#lastTimestamp = timestamp;

        this.#hoverScale.step(deltaTime);
        this.#squishY.step(deltaTime);
        this.#highlightX.step(deltaTime);
        this.#highlightY.step(deltaTime);

        const hoverScale = this.#hoverScale.value;
        const squishY = this.#squishY.value;
        // Volume-conserving expansion: gel widens as it squishes, like a soft material.
        // Both axes are multiplied by hoverScale so hover-raised and squish compose cleanly.
        const squishX = 1 + (1 - squishY) * 0.45;

        const el = this.#el;
        el.style.setProperty('--gel-scale-x', (squishX * hoverScale).toFixed(4));
        el.style.setProperty('--gel-scale-y', (squishY * hoverScale).toFixed(4));
        el.style.setProperty('--gel-highlight-x', this.#highlightX.value.toFixed(2) + '%');
        el.style.setProperty('--gel-highlight-y', this.#highlightY.value.toFixed(2) + '%');

        const allSettled = (
                this.#hoverScale.isSettled() &&
                this.#squishY.isSettled() &&
                this.#highlightX.isSettled() &&
                this.#highlightY.isSettled()
        );

        if (allSettled) {
            this.#rafId = null;
            this.#lastTimestamp = null;
            return;
        }

        this.#rafId = requestAnimationFrame(this.#animationLoop);
    };

    press() {
        this.#squishY.setTarget(0.88);
        this.#startLoop();
    }

    release() {
        this.#squishY.setTarget(1);
        this.#startLoop();
    }

    static getInstance(el) {
        return Gel.#instances.get(el) ?? null;
    }

    destroy() {
        if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
        const el = this.#el;
        el.removeEventListener('mouseenter', this.#onMouseEnter);
        el.removeEventListener('mousemove', this.#onMouseMove);
        el.removeEventListener('mouseleave', this.#onMouseLeave);
        el.removeEventListener('mousedown', this.#onPress);
        el.removeEventListener('mouseup', this.#onRelease);
        el.removeEventListener('touchstart', this.#onPress);
        el.removeEventListener('touchend', this.#onRelease);
        el.removeEventListener('keydown', this.#onKeyDown);
        el.removeEventListener('keyup', this.#onKeyUp);
        Gel.#instances.delete(el);
    }
}

/**
 * Draggable slider built on gel aesthetics.
 *
 * HTML structure expected:
 *   <div data-gel-slider role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40" tabindex="0">
 *     <div class="gel-slider__track">
 *       <div class="gel-slider__fill"></div>
 *       <div class="gel-slider__thumb-positioner">
 *         <div class="gel gel-slider__thumb"></div>
 *       </div>
 *     </div>
 *   </div>
 *
 * The thumb-positioner handles centering; the .gel child owns spring physics via Gel.initAll().
 */
class GelSlider {
    static #instances = new WeakMap();

    #el;
    #trackEl;
    #fillEl;
    #positionerEl;
    #thumbEl;
    #min;
    #max;
    #value;
    #isDragging = false;
    #isKeyboardPressed = false;

    constructor(el) {
        this.#el = el;
        this.#trackEl = el.querySelector('.gel-slider__track');
        this.#fillEl = el.querySelector('.gel-slider__fill');
        this.#positionerEl = el.querySelector('.gel-slider__thumb-positioner');
        this.#thumbEl = el.querySelector('.gel-slider__thumb');
        this.#min = parseFloat(el.getAttribute('aria-valuemin') ?? '0');
        this.#max = parseFloat(el.getAttribute('aria-valuemax') ?? '100');
        this.#value = parseFloat(el.getAttribute('aria-valuenow') ?? '50');
        this.#render();
        this.#attachListeners();
        this.#syncDisabledState();
        new MutationObserver(() => this.#syncDisabledState())
                .observe(el, {attributes: true, attributeFilter: ['class']});
    }

    get #fraction() {
        return (this.#value - this.#min) / (this.#max - this.#min);
    }

    #render() {
        const pct = this.#fraction * 100;
        this.#fillEl.style.width = `${pct}%`;
        this.#positionerEl.style.left = `${pct}%`;
        this.#el.setAttribute('aria-valuenow', String(Math.round(this.#value)));
    }

    #isDisabled() {
        return this.#el.classList.contains('gel-disabled');
    }

    #syncDisabledState() {
        const disabled = this.#isDisabled();
        this.#el.setAttribute('tabindex', disabled ? '-1' : '0');
        this.#el.setAttribute('aria-disabled', String(disabled));
    }

    #setValueFromClientX(clientX) {
        const rect = this.#trackEl.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        this.#value = this.#min + fraction * (this.#max - this.#min);
        this.#render();
    }

    #attachListeners() {
        this.#thumbEl.addEventListener('pointerdown', this.#onThumbPointerDown);
        this.#trackEl.addEventListener('pointerdown', this.#onTrackPointerDown);
        this.#el.addEventListener('keydown', this.#onKeyDown);
        this.#el.addEventListener('keyup', this.#onKeyUp);
    }

    #onTrackPointerDown = (event) => {
        if (this.#isDisabled()) return;
        if (event.target.closest('.gel-slider__thumb')) return;
        this.#setValueFromClientX(event.clientX);
        this.#el.focus();
    };

    // No preventDefault — allows mousedown/touchstart to propagate so Gel spring physics sees the press.
    #onThumbPointerDown = (event) => {
        if (this.#isDisabled()) return;
        this.#isDragging = true;
        this.#thumbEl.setPointerCapture(event.pointerId);
        this.#thumbEl.addEventListener('pointermove', this.#onThumbPointerMove);
        this.#thumbEl.addEventListener('pointerup', this.#onThumbPointerUp);
    };

    #onThumbPointerMove = (event) => {
        if (this.#isDisabled()) return;
        if (!this.#isDragging) return;
        this.#setValueFromClientX(event.clientX);
    };

    #onThumbPointerUp = () => {
        this.#isDragging = false;
        this.#thumbEl.removeEventListener('pointermove', this.#onThumbPointerMove);
        this.#thumbEl.removeEventListener('pointerup', this.#onThumbPointerUp);
    };

    #onKeyDown = (event) => {
        if (this.#isDisabled()) return;
        const stepSize = (this.#max - this.#min) / 20;
        const keyActions = {
            ArrowRight: () => {
                this.#value = Math.min(this.#max, this.#value + stepSize);
            },
            ArrowUp: () => {
                this.#value = Math.min(this.#max, this.#value + stepSize);
            },
            ArrowLeft: () => {
                this.#value = Math.max(this.#min, this.#value - stepSize);
            },
            ArrowDown: () => {
                this.#value = Math.max(this.#min, this.#value - stepSize);
            },
            Home: () => {
                this.#value = this.#min;
            },
            End: () => {
                this.#value = this.#max;
            },
        };
        const action = keyActions[event.key];
        if (!action) return;
        event.preventDefault();
        action();
        this.#render();
        if (!this.#isKeyboardPressed) {
            this.#isKeyboardPressed = true;
            Gel.getInstance(this.#thumbEl)?.press();
        }
    };

    #onKeyUp = (event) => {
        const sliderKeys = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'];
        if (!sliderKeys.includes(event.key) || !this.#isKeyboardPressed) return;
        this.#isKeyboardPressed = false;
        Gel.getInstance(this.#thumbEl)?.release();
    };

    static initAll(root = document) {
        root.querySelectorAll('[data-gel-slider]').forEach(el => {
            if (!GelSlider.#instances.has(el)) {
                GelSlider.#instances.set(el, new GelSlider(el));
            }
        });
    }
}

export {Gel, GelSlider, SpringValue};
