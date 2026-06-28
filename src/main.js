import './style.css';
import './gel.css';
import {Gel, GelSlider} from './gel.js';

document.addEventListener('DOMContentLoaded', () => {
    GelSlider.initAll();
    Gel.initAll();
    initTheme();
});

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
