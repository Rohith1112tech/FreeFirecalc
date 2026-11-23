/**
 * =========================================================================
 * JACK SPARROW ESPORTS - SECURITY TEST SUITE: XSS & HTML INJECTION
 * Verifies DOM XSS immunity, input sanitization, and safe DOM construction
 * =========================================================================
 */

const assert = require('assert');
const fs = require('fs');

console.log('🛡️ RUNNING PHASE 1 SECURITY TESTS: XSS & DOM INJECTION IMMUNITY...\n');

// Mock DOM environment for Node.js
const domStore = {};
function createMockEl(id = 'el', tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    innerHTML: '',
    value: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    addEventListener: () => {},
    appendChild: (c) => c,
    removeChild: (c) => c,
    querySelectorAll: () => []
  };
}

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.document = {
  getElementById: (id) => domStore[id] || (domStore[id] = createMockEl(id)),
  createElement: (tag) => createMockEl('el_' + Math.random(), tag),
  querySelectorAll: () => [],
  addEventListener: () => {},
  documentElement: createMockEl('html', 'html'),
  body: createMockEl('body', 'body')
};
global.window = {
  location: { href: 'http://localhost/', search: '', hash: '' },
  history: { replaceState: () => {} },
  scrollTo: () => {}
};

const appJs = fs.readFileSync('app.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// 1. Verify escapeHtml implementation
assert(appJs.includes('function escapeHtml'), 'app.js must declare escapeHtml function');
const { escapeHtml } = require('./app.js');

const xssPayloads = [
  { input: '<script>alert("pwned")</script>', expected: '&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;' },
  { input: '<img src=x onerror=alert(1)>', expected: '&lt;img src=x onerror=alert(1)&gt;' },
  { input: '" onmouseover="alert(1)', expected: '&quot; onmouseover=&quot;alert(1)' },
  { input: "';alert(1);'", expected: "&#039;;alert(1);&#039;" },
  { input: '<svg/onload=alert(1)>', expected: '&lt;svg/onload=alert(1)&gt;' }
];

xssPayloads.forEach(({ input, expected }, idx) => {
  const sanitized = escapeHtml(input);
  assert.strictEqual(sanitized, expected, `Payload ${idx + 1} not properly escaped`);
  assert(!sanitized.includes('<script'), 'Sanitized output must not contain unescaped script tag');
  assert(!sanitized.includes('<img'), 'Sanitized output must not contain unescaped img tag');
  assert(!sanitized.includes('<svg'), 'Sanitized output must not contain unescaped svg tag');
});
console.log('✓ escapeHtml successfully neutralizes all malicious script and attribute payloads.');

// 2. Verify Slot Preview safe DOM methods
assert(
  !appJs.includes('item.innerHTML = `\n        <span class="paste-item-team">Slot ${s}: ${parsed[s].teamName}</span>'),
  'Slot preview must not inject unescaped parsed teamName or player list via innerHTML'
);
assert(appJs.includes('teamSpan.textContent = `Slot ${s}: ${parsed[s].teamName}`'), 'Slot preview must use textContent for team name');
assert(appJs.includes('playersSpan.textContent = pStr'), 'Slot preview must use textContent for player roster');
console.log('✓ Slot preview (lines 975-985) verified to use safe DOM textContent methods.');

// 3. Verify absence of unsafe document.write in index.html
assert(!indexHtml.includes('document.write('), 'index.html must not use unsafe document.write');
console.log('✓ index.html verified: zero occurrences of document.write.');

// 4. Verify matrix and auto-match preview table escaping
assert(appJs.includes('escapeHtml(teamStat.teamName)'), 'Matrix table must escape team name');
assert(appJs.includes('escapeHtml(t.teamName)'), 'Auto match preview must escape team name');
assert(appJs.includes('escapeHtml(fragger.playerName)'), 'MVP podium fragger name must be escaped');
console.log('✓ Matrix, Auto-match, and MVP podium displays verified to escape dynamic team and player names.');

console.log('\n=======================================================');
console.log('🎉 ALL XSS & DOM INJECTION SECURITY TESTS PASSED 100%!');
console.log('=======================================================\n');
