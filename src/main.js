import './style.css';
import './gel.scss';
import {Gel, GelSlider, SpringValue} from './gel.js';

document.addEventListener('DOMContentLoaded', () => {
    GelSlider.initAll();
    Gel.initAll();
    initTheme();
    initGelCursor();
});

function initGelCursor() {
    const cursor = document.getElementById('gel-cursor');
    if (!cursor) return;

    const RADIUS = 28;

    // Position springs — underdamped so fast moves ricochet past target
    const springX = new SpringValue({ stiffness: 260, damping: 18 });
    const springY = new SpringValue({ stiffness: 260, damping: 18 });

    // Scale spring for click squish (scaleY drops on mousedown, rebounds on mouseup)
    const springScaleX = new SpringValue({ stiffness: 300, damping: 12, value: 1 });
    const springScaleY = new SpringValue({ stiffness: 300, damping: 12, value: 1 });

    let rafId = null;
    let lastTime = 0;
    let active = false;

    function tick(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        springX.step(dt);
        springY.step(dt);
        springScaleX.step(dt);
        springScaleY.step(dt);

        cursor.style.transform =
            `translate(${springX.value}px, ${springY.value}px) ` +
            `scaleX(${springScaleX.value}) scaleY(${springScaleY.value})`;

        const settled =
            springX.isSettled() && springY.isSettled() &&
            springScaleX.isSettled() && springScaleY.isSettled();

        if (!settled) {
            rafId = requestAnimationFrame(tick);
        } else {
            rafId = null;
        }
    }

    function ensureRunning() {
        if (!rafId) {
            lastTime = performance.now();
            rafId = requestAnimationFrame(tick);
        }
    }

    let stopTimer = null;
    let prevClientX = 0, prevClientY = 0, prevMoveTime = 0;

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX - RADIUS;
        const y = e.clientY - RADIUS;
        const now = performance.now();

        // Measure instantaneous mouse speed (px/ms)
        const dt = now - prevMoveTime;
        const speed = dt > 0 ? Math.hypot(e.clientX - prevClientX, e.clientY - prevClientY) / dt : 0;
        prevClientX = e.clientX;
        prevClientY = e.clientY;
        prevMoveTime = now;

        springX.setTarget(x);
        springY.setTarget(y);

        if (!active) {
            springX.value = x;
            springY.value = y;
            cursor.style.opacity = '1';
            document.body.classList.add('gel-cursor-active');
            active = true;
        }

        // Jiggle on stop: fire when no mousemove for 90ms, kick magnitude ~ speed
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
            const kick = Math.min(speed * 5, 6);
            if (kick > 0.8) {
                springScaleX.velocity += kick * 0.6;
                springScaleY.velocity -= kick;
                ensureRunning();
            }
        }, 90);

        ensureRunning();
    });

    // Click squish: compress on down, spring back on up
    document.addEventListener('mousedown', () => {
        springScaleX.setTarget(1.18);
        springScaleY.setTarget(0.72);
        ensureRunning();
    });

    document.addEventListener('mouseup', () => {
        springScaleX.setTarget(1);
        springScaleY.setTarget(1);
        ensureRunning();
    });

    // Jiggle when leaving a gel element — velocity impulse, target stays at 1
    document.addEventListener('mouseout', (e) => {
        const el = e.target;
        if (el.classList.contains('gel') && !el.contains(e.relatedTarget)) {
            springScaleX.velocity += 7;
            springScaleY.velocity -= 5;
            ensureRunning();
        }
    });

    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        document.body.classList.remove('gel-cursor-active');
        active = false;
    });

    document.addEventListener('mouseenter', () => {
        if (active) {
            cursor.style.opacity = '1';
            document.body.classList.add('gel-cursor-active');
        }
    });
}

function initTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('theme-toggle');

    const saved = localStorage.getItem('gel-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.dataset.theme = saved ?? (prefersDark ? 'dark' : 'light');
    syncIcon();

    btn.addEventListener('click', () => {
        html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('gel-theme', html.dataset.theme);
        syncIcon();
    });

    function syncIcon() {
        btn.textContent = html.dataset.theme === 'dark' ? '☀' : '☾';
    }
}
