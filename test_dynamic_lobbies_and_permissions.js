/**
 * Verification Suite: Dynamic Lobbies, Admin Assignments, Read-Only Mode & Edge Function CRUD
 */
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 RUNNING DYNAMIC LOBBIES & ACCESS CONTROL VERIFICATION SUITE...\n');

// 1. Syntax checks across modified JS files
['app.js', 'auth.js', 'admin.js'].forEach((file) => {
  execSync(`node --check ${file}`, { stdio: 'pipe' });
  console.log(`✓ ${file} syntax valid (0 errors).`);
});

// 2. HTML / JS / CSS Structural Checks
const indexHtml = fs.readFileSync('index.html', 'utf8');
const adminHtml = fs.readFileSync('admin.html', 'utf8');
const adminJs = fs.readFileSync('admin.js', 'utf8');
const authJs = fs.readFileSync('auth.js', 'utf8');
const appJs = fs.readFileSync('app.js', 'utf8');
const styleCss = fs.readFileSync('style.css', 'utf8');
const edgeFn = fs.readFileSync('supabase/functions/admin-users/index.ts', 'utf8');

// Index.html checks
assert(indexHtml.includes('id="lobby-tabs-group"'), 'index.html must expose #lobby-tabs-group');
assert(indexHtml.includes('id="lobby-readonly-banner"'), 'index.html must expose #lobby-readonly-banner');
assert(indexHtml.includes('id="btn-goto-assigned-lobby"'), 'index.html must expose quick switch button in read-only banner');
console.log('✓ index.html dynamic lobby container & view-only banner verified.');

// Admin.html & admin.js checks
[
  'id="tab-admin-users"',
  'id="tab-admin-lobbies"',
  'id="admin-create-lobbies-group"',
  'id="edit-user-lobbies-group"',
  'id="admin-lobby-create-form"',
  'id="admin-create-lobby-users-group"',
  'id="admin-lobbies-tbody"',
  'id="admin-lobby-edit-modal-backdrop"',
  'id="edit-lobby-users-group"',
  'id="admin-lobby-delete-modal-backdrop"'
].forEach((token) => {
  assert(adminHtml.includes(token), `admin.html missing ${token}`);
});
assert(adminJs.includes('lobby_create') && adminJs.includes('lobby_update') && adminJs.includes('lobby_delete'), 'admin.js must support lobby CRUD actions');
assert(adminJs.includes('assigned_lobbies') && adminJs.includes('assigned_user_ids'), 'admin.js must wire bidirectional user <-> lobby assignments');
assert(adminJs.includes('bindEnterNavigation(lobbyCreateForm') && adminJs.includes('bindEnterNavigation(lobbyEditForm'), 'admin.js must keep keyboard Enter navigation on lobby forms');
console.log('✓ admin.html and admin.js verified with Users + Lobbies tabs, assignments, and keyboard navigation.');

// Auth.js checks
assert(authJs.includes('async function fetchLobbiesConfig('), 'auth.js must provide fetchLobbiesConfig');
assert(authJs.includes('async function fetchMyLobbyAssignments('), 'auth.js must provide fetchMyLobbyAssignments');
assert(!authJs.includes('service_role'), 'auth.js must never contain service_role key');
console.log('✓ auth.js Supabase dynamic lobby & assignment helpers verified.');

// Edge Function checks
['lobby_list', 'lobby_create', 'lobby_update', 'lobby_delete', 'lobby_assignments', 'lobbies'].forEach((token) => {
  assert(edgeFn.includes(token), `Edge Function missing ${token}`);
});
assert(edgeFn.includes('callerRole !== "SUPER_ADMIN"'), 'Edge Function must enforce SUPER_ADMIN strictly');
assert(edgeFn.includes('Cannot delete the last remaining lobby'), 'Edge Function must protect last remaining lobby');
console.log('✓ Supabase Edge Function admin-users verified for full lobby & assignment CRUD.');

// Style checks
['.admin-section-tabs', '.admin-check-pill', '.admin-lobby-chip', '.lobby-readonly-banner', '.lobby-tab-readonly'].forEach((cls) => {
  assert(styleCss.includes(cls), `style.css missing ${cls}`);
});
console.log('✓ style.css verified for admin tabs, assignment chips, and view-only banner.');

// 3. Simulated DOM Functional Test of app.js Dynamic Lobbies & Read-Only Guard
const domStore = {};
function makeMockEl(id, tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    className: '',
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    dataset: {},
    style: {},
    children: [],
    classList: {
      _set: new Set(),
      add(...cls) { cls.forEach((c) => this._set.add(c)); },
      remove(...cls) { cls.forEach((c) => this._set.delete(c)); },
      toggle(c, f) { if (f === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); } else if (f) this._set.add(c); else this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    addEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { return c; },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
}
const ls = {};
global.localStorage = {
  getItem: (k) => ls[k] || null,
  setItem: (k, v) => { ls[k] = String(v); },
  removeItem: (k) => { delete ls[k]; }
};
global.document = {
  getElementById: (id) => domStore[id] || (domStore[id] = makeMockEl(id)),
  createElement: (tag) => makeMockEl('el_' + Math.random(), tag),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  documentElement: makeMockEl('html', 'html'),
  body: makeMockEl('body', 'body')
};
global.window = {
  location: { href: 'http://localhost/', search: '', hash: '' },
  history: { replaceState: () => {} },
  scrollTo: () => {}
};

// Mock JSEAuth as a Tournament Admin assigned ONLY to lobby2
global.JSEAuth = {
  getActiveSession: () => ({ id: 'u2', username: 'Js.Pokemon', role: 'TOURNAMENT_ADMIN' }),
  hasPermission: (act) => act !== 'RESET_TOURNAMENT' && act !== 'MANAGE_CREDENTIALS',
  getSupabaseClient: () => null
};

const app = require('./app.js');

// Apply 4 dynamic lobbies (including newly added lobby4 & renamed lobby1)
app.applyLobbiesFromSupabase([
  { id: 'lobby1', label: 'GROUP A', defaultTitle: 'SCRIMS GROUP A', dbTag: 'DB-01', sortOrder: 1 },
  { id: 'lobby2', label: 'LOBBY 2', defaultTitle: 'SCRIMS LOBBY 2', dbTag: 'DB-02', sortOrder: 2 },
  { id: 'lobby3', label: 'LOBBY 3', defaultTitle: 'SCRIMS LOBBY 3', dbTag: 'DB-03', sortOrder: 3 },
  { id: 'finals', label: 'GRAND FINALS', defaultTitle: 'GRAND FINALS SCRIMS', dbTag: 'DB-04', sortOrder: 4 }
]);

assert.strictEqual(app.LOBBY_CONFIGS.lobby1.label, 'GROUP A', 'Dynamic rename must update LOBBY_CONFIGS');
assert.ok(app.LOBBY_CONFIGS.finals, 'Dynamic newly added lobby "finals" must exist in LOBBY_CONFIGS');
assert.strictEqual(app.LOBBY_CONFIGS.finals.label, 'GRAND FINALS');
console.log('✓ Dynamic lobbies addition and renaming verified in runtime.');

// Verify permission guard on Js.Pokemon (assigned to lobby2)
assert.strictEqual(app.canEditLobby('lobby2'), true, 'Js.Pokemon must be able to edit lobby2');
assert.strictEqual(app.canEditLobby('lobby1'), false, 'Js.Pokemon must NOT be able to edit lobby1');
assert.strictEqual(app.canEditLobby('finals'), false, 'Js.Pokemon must NOT be able to edit unassigned finals lobby');

// Verify saveState refuses to write localStorage when viewing unassigned lobby1
app.state.activeLobby = 'lobby1';
app.state.tournamentTitle = 'TAMPER ATTEMPT';
app.saveState();
assert.strictEqual(ls['ff_tournament_calculator_state_lobby1'], undefined, 'saveState must block writes to unassigned lobby1');

// Verify saveState writes cleanly when on assigned lobby2
app.state.activeLobby = 'lobby2';
app.state.tournamentTitle = 'LEGIT LOBBY 2 SCRIMS';
app.saveState();
assert.ok(ls['ff_tournament_calculator_state_lobby2'].includes('LEGIT LOBBY 2 SCRIMS'), 'saveState must succeed on assigned lobby2');
console.log('✓ Dynamic RBAC & read-only write guard verified (assigned edits allowed, unassigned writes blocked).');

console.log('\n=======================================================');
console.log('🎉 ALL DYNAMIC LOBBIES & ACCESS CONTROL TESTS PASSED!');
console.log('=======================================================');
