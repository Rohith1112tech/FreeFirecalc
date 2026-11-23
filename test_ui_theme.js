/**
 * Unit Test: Switchable Esports Dark-Mode UI Theme (Cyber Blue <-> Neon Crimson)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=======================================================");
console.log("🎨 RUNNING UI THEME SWITCHER (CYBER BLUE & NEON CRIMSON) TESTS");
console.log("=======================================================\n");

// 1. Verify index.html contains the theme toggle button
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
assert(html.includes('id="btn-toggle-ui-theme"'), 'index.html must contain id="btn-toggle-ui-theme"');
assert(html.includes('id="ui-theme-btn-text"'), 'index.html must contain id="ui-theme-btn-text"');
assert(html.includes('UI: CYBER BLUE'), 'index.html must default to UI: CYBER BLUE');
console.log("✓ index.html theme toggle button and label verified.");

// 2. Verify style.css contains Cyber Blue variables on :root
const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');
assert(css.includes('--bg-dark: #050b16'), 'style.css :root must define Cyber Blue --bg-dark: #050b16');
assert(css.includes('--bg-card: #0a162b'), 'style.css :root must define Cyber Blue --bg-card: #0a162b');
assert(css.includes('--bg-input: #0d1e3a'), 'style.css :root must define Cyber Blue --bg-input: #0d1e3a');
assert(css.includes('--primary-accent: #00c2ff'), 'style.css :root must define Cyber Blue --primary-accent: #00c2ff');
assert(css.includes('--secondary-accent: #0066ff'), 'style.css :root must define Cyber Blue --secondary-accent: #0066ff');
assert(css.includes('--text-muted: #8fa5c4'), 'style.css :root must define Cyber Blue --text-muted: #8fa5c4');
console.log("✓ style.css Theme 1 (Cyber Blue) CSS variables on :root verified.");

// 3. Verify style.css contains Neon Crimson variables on [data-ui-theme="crimson"]
assert(css.includes('[data-ui-theme="crimson"]'), 'style.css must define [data-ui-theme="crimson"] selector');
assert(css.includes('--bg-dark: #0d0406'), 'style.css crimson must define --bg-dark: #0d0406');
assert(css.includes('--bg-card: #1a080c'), 'style.css crimson must define --bg-card: #1a080c');
assert(css.includes('--bg-input: #260b11'), 'style.css crimson must define --bg-input: #260b11');
assert(css.includes('--primary-accent: #ff1e42'), 'style.css crimson must define --primary-accent: #ff1e42');
assert(css.includes('--secondary-accent: #b80022'), 'style.css crimson must define --secondary-accent: #b80022');
assert(css.includes('--text-muted: #c4969e'), 'style.css crimson must define --text-muted: #c4969e');
console.log("✓ style.css Theme 2 (Neon Crimson) CSS variables verified.");

// 4. Verify style.css component polish (modals, lobby-ui-theme-btn, tables, and themed badges)
assert(css.includes('.lobby-ui-theme-btn'), 'style.css must style .lobby-ui-theme-btn');
assert(css.includes('backdrop-filter: var(--modal-backdrop)'), 'style.css must apply modal backdrop blur');
assert(css.includes('--modal-radius: 16px'), 'style.css must have 16px modal radius');
assert(css.includes('.cyber-matrix-table tbody tr:nth-child(even)'), 'style.css must have alternating table row shading');
assert(css.includes('--badge-tag-text: #00c2ff'), 'style.css :root must define --badge-tag-text: #00c2ff');
assert(css.includes('--badge-tag-text: #ff4d6d'), 'style.css crimson must define --badge-tag-text: #ff4d6d');
assert(css.includes('--minus-tag-text: #38bdf8'), 'style.css :root must define --minus-tag-text: #38bdf8');
assert(css.includes('--minus-tag-text: #f87171'), 'style.css crimson must define --minus-tag-text: #f87171');
assert(css.includes('--btn-danger-bg'), 'style.css must define --btn-danger-bg');
assert(css.includes('--btn-update-grad'), 'style.css must define --btn-update-grad');

// Verify that user-spotted red elements in Cyber Blue are cleanly themed
assert(css.includes('.roster-counter {\n  font-family: var(--font-tech);\n  font-weight: 700;\n  font-size: 0.85rem;\n  letter-spacing: 1.5px;\n  color: var(--badge-tag-text);\n  background: var(--badge-tag-bg);'), '.roster-counter must use themed variables');
assert(css.includes('.minus-label {\n  font-family: var(--font-tech);\n  font-size: 0.74rem;\n  font-weight: 800;\n  letter-spacing: 1.1px;\n  color: var(--minus-tag-text);'), '.minus-label must use --minus-tag-text');
assert(css.includes('.team-pts-preview b {\n  color: var(--pts-preview-num);'), '.team-pts-preview b must use --pts-preview-num');
assert(css.includes('.player-p-prefix {\n  font-family: var(--font-display);\n  font-size: 0.65rem;\n  font-weight: 800;\n  color: var(--prefix-tag-text);'), '.player-p-prefix must use --prefix-tag-text');
console.log("✓ style.css component polish (theme button, modals blur & radius, table polish, zero red bleed in Cyber Blue) verified.");

// 5. Test app.js JavaScript theme functions in DOM mock
const domElements = {};
function createMockElement(id, tag = 'div') {
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    style: {},
    attributes: {},
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); el.className = Array.from(this._classes).join(' '); },
      remove: function(c) { this._classes.delete(c); el.className = Array.from(this._classes).join(' '); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
        el.className = Array.from(this._classes).join(' ');
      },
      contains: function(c) { return this._classes.has(c); }
    },
    setAttribute: function(name, val) { this.attributes[name] = String(val); },
    getAttribute: function(name) { return this.attributes[name]; },
    removeAttribute: function(name) { delete this.attributes[name]; },
    addEventListener: function(evt, handler) { this._handlers = this._handlers || {}; (this._handlers[evt] = this._handlers[evt] || []).push(handler); },
    dispatchEvent: function(event) { if (this._handlers && this._handlers[event.type]) { this._handlers[event.type].forEach(h => h(event)); } },
    appendChild: function(c) { return c; },
    removeChild: function(c) { return c; },
    querySelectorAll: function() { return []; }
  };
  domElements[id] = el;
  return el;
}

const storageStore = {};
global.localStorage = {
  getItem: (key) => storageStore[key] || null,
  setItem: (key, val) => { storageStore[key] = String(val); },
  removeItem: (key) => { delete storageStore[key]; },
  clear: () => {
    for (const k of Object.keys(storageStore)) delete storageStore[k];
  }
};

const mockDocElement = createMockElement('documentElement', 'html');

global.document = {
  documentElement: mockDocElement,
  getElementById: (id) => domElements[id] || createMockElement(id),
  createElement: (tag) => createMockElement('el_' + Math.random().toString(36).substring(2, 8), tag),
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: createMockElement('body')
};

global.window = {
  location: { href: 'https://calculator.test/', search: '', hash: '' },
  history: { replaceState: () => {} },
  scrollTo: () => {}
};

const app = require('./app.js');
assert.strictEqual(typeof app.getSavedUiTheme, 'function', 'app.getSavedUiTheme must be a function');
assert.strictEqual(typeof app.applyUiTheme, 'function', 'app.applyUiTheme must be a function');
assert.strictEqual(typeof app.toggleUiTheme, 'function', 'app.toggleUiTheme must be a function');

// Test default theme
assert.strictEqual(app.getSavedUiTheme(), 'blue', 'Default theme must be blue');

// Test applyUiTheme('crimson')
app.applyUiTheme('crimson');
assert.strictEqual(mockDocElement.getAttribute('data-ui-theme'), 'crimson', 'documentElement must have data-ui-theme="crimson"');
assert.strictEqual(document.getElementById('ui-theme-btn-text').textContent, 'UI: NEON CRIMSON', 'Button text must update to UI: NEON CRIMSON');
assert.strictEqual(localStorage.getItem('jse_ui_theme'), 'crimson', 'localStorage jse_ui_theme must be crimson');
console.log("✓ applyUiTheme('crimson') correctly updates DOM attribute, label, and localStorage.");

// Test toggleUiTheme() from crimson to blue
app.toggleUiTheme();
assert.strictEqual(mockDocElement.getAttribute('data-ui-theme'), undefined, 'data-ui-theme attribute must be removed for default blue');
assert.strictEqual(document.getElementById('ui-theme-btn-text').textContent, 'UI: CYBER BLUE', 'Button text must update to UI: CYBER BLUE');
assert.strictEqual(localStorage.getItem('jse_ui_theme'), 'blue', 'localStorage jse_ui_theme must be blue');
console.log("✓ toggleUiTheme() correctly switches back to Cyber Blue and persists state.");

// Test toggleUiTheme() from blue to crimson
app.toggleUiTheme();
assert.strictEqual(mockDocElement.getAttribute('data-ui-theme'), 'crimson');
assert.strictEqual(document.getElementById('ui-theme-btn-text').textContent, 'UI: NEON CRIMSON');
assert.strictEqual(localStorage.getItem('jse_ui_theme'), 'crimson');
console.log("✓ toggleUiTheme() toggles smoothly without page reload.");

console.log("\n=======================================================");
console.log("🎉 ALL UI THEME SWITCHER TESTS PASSED 100%!");
console.log("=======================================================\n");
