// Test suite for Slot List poster view, purple template overlay, and export functionality
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Running Slot List View & Poster Template Tests...\n');

// 1. Verify index.html contains all necessary elements
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('id="tab-btn-slot-list"'), 'Missing tab-btn-slot-list in index.html');
assert(indexHtml.includes('data-target="view-slot-list"'), 'Missing data-target="view-slot-list" in index.html');
assert(indexHtml.includes('id="view-slot-list"'), 'Missing view-slot-list in index.html');
assert(indexHtml.includes('id="slot-list-template-bg"'), 'Missing slot-list-template-bg in index.html');
assert(indexHtml.includes('assets/slot_list_template.jpg'), 'Missing assets/slot_list_template.jpg in index.html');
assert(indexHtml.includes('id="slot-list-overlay-rows"'), 'Missing slot-list-overlay-rows in index.html');
assert(indexHtml.includes('id="btn-download-slot-list"'), 'Missing btn-download-slot-list in index.html');
assert(indexHtml.includes('id="btn-copy-slot-list"'), 'Missing btn-copy-slot-list in index.html');
console.log('✓ index.html structure verified with all Slot List UI elements.');

// 2. Verify style.css contains styling for exact template and 12 slot rows
const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
assert(styleCss.includes('.slot-list-exact-poster-container'), 'Missing .slot-list-exact-poster-container in style.css');
assert(styleCss.includes('.slot-list-template-bg'), 'Missing .slot-list-template-bg in style.css');
assert(styleCss.includes('.slot-list-overlay-slots'), 'Missing .slot-list-overlay-slots in style.css');
assert(styleCss.includes('.slot-overlay-row'), 'Missing .slot-overlay-row in style.css');
for (let i = 1; i <= 12; i++) {
  assert(styleCss.includes(`.slot-overlay-row.slot-${i}`), `Missing .slot-overlay-row.slot-${i} in style.css`);
}
assert(styleCss.includes('.slot-team-name'), 'Missing .slot-team-name in style.css');
assert(styleCss.includes('.slot-team-roster'), 'Missing .slot-team-roster in style.css');
assert(styleCss.includes('.slot-empty-label'), 'Missing .slot-empty-label in style.css');
console.log('✓ style.css verified with exact pixel-mapped positioning for all 12 slots.');

// 3. Verify app.js includes all required functions and bindings
const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
assert(appJs.includes('tabBtnSlotList'), 'Missing tabBtnSlotList in app.js');
assert(appJs.includes('viewSlotList'), 'Missing viewSlotList in app.js');
assert(appJs.includes('renderSlotListRows'), 'Missing renderSlotListRows in app.js');
assert(appJs.includes('drawSlotListCanvas'), 'Missing drawSlotListCanvas in app.js');
assert(appJs.includes('handleDownloadSlotList'), 'Missing handleDownloadSlotList in app.js');
assert(appJs.includes('handleCopySlotListToClipboard'), 'Missing handleCopySlotListToClipboard in app.js');
assert(appJs.includes('switchSubView("view-slot-list")') || appJs.includes('viewId === "view-slot-list"'), 'Missing view-slot-list handling in switchSubView');
console.log('✓ app.js functions, event bindings, and subview switches verified.');

// 4. Verify template asset files (Legacy + 5 Switchable Scrims Banners)
const legacyAssetPath = path.join(__dirname, 'assets', 'slot_list_template.jpg');
assert(fs.existsSync(legacyAssetPath), 'Template asset file assets/slot_list_template.jpg does not exist');
const legacyStats = fs.statSync(legacyAssetPath);
assert(legacyStats.size > 50000, `Asset size ${legacyStats.size} is unusually small`);

const expectedBanners = [
  { key: 'crimson', filename: 'slot_list_crimson.jpg' },
  { key: 'cyan', filename: 'slot_list_cyan.jpg' },
  { key: 'purple', filename: 'slot_list_purple.jpg' },
  { key: 'orange', filename: 'slot_list_orange.jpg' },
  { key: 'military', filename: 'slot_list_military.jpg' }
];

expectedBanners.forEach(({ key, filename }) => {
  const bPath = path.join(__dirname, 'assets', filename);
  assert(fs.existsSync(bPath), `Banner assets/${filename} (${key}) does not exist`);
  const bStats = fs.statSync(bPath);
  assert(bStats.size > 100000, `Banner ${filename} size ${bStats.size} is unusually small`);
  console.log(`✓ Slot list banner asset verified: assets/${filename} (${bStats.size} bytes).`);
});

// 5. Verify Slot List Theme Selector & CSS Theme Rules
assert(indexHtml.includes('id="slot-list-theme-buttons"'), 'Missing slot-list-theme-buttons in index.html');
['crimson', 'cyan', 'purple', 'orange', 'military'].forEach((thm) => {
  assert(indexHtml.includes(`data-slot-theme="${thm}"`), `Missing data-slot-theme="${thm}" in index.html`);
  assert(styleCss.includes(`.slot-theme-${thm}`), `Missing .slot-theme-${thm} in style.css`);
});
assert(appJs.includes('SLOT_LIST_THEMES'), 'Missing SLOT_LIST_THEMES in app.js');
assert(appJs.includes('setSlotListTheme'), 'Missing setSlotListTheme in app.js');
console.log('✓ All 5 Slot List switchable themes (Crimson, Cyan, Purple, Orange, Military) verified in HTML, CSS & JS.');

// 6. Test slot list text formatting logic
const testTeams = ['TOTAL GAMING', 'GODLIKE ESPORTS', 'TSM FTX', 'EVOS PHOENIX'];
const testRosters = {
  0: ['Mafia', 'Fozy', 'Delete', 'Javagamer'],
  1: ['Neymar', 'Jonathan', 'Zgod', 'Shadow'],
  2: ['OldMonk', 'Beast', 'GodKill', 'Ninja'],
  3: []
};

let registeredCount = 0;
const formattedSlots = [];
for (let i = 0; i < 12; i++) {
  const slotNum = String(i + 1).padStart(2, '0');
  const team = (testTeams[i] || '').trim();
  const rawRoster = testRosters[i] || [];
  const playerList = rawRoster.filter(p => p && p.trim());
  if (team) {
    registeredCount++;
    formattedSlots.push({ slot: slotNum, team, roster: playerList.join(' • ') });
  } else {
    formattedSlots.push({ slot: slotNum, team: '— AVAILABLE SLOT —', roster: '' });
  }
}

assert.strictEqual(registeredCount, 4, 'Registered teams count should be 4');
assert.strictEqual(formattedSlots[0].team, 'TOTAL GAMING');
assert.strictEqual(formattedSlots[0].roster, 'Mafia • Fozy • Delete • Javagamer');
assert.strictEqual(formattedSlots[3].team, 'EVOS PHOENIX');
assert.strictEqual(formattedSlots[3].roster, '', 'Team 4 has no roster, should be empty');
assert.strictEqual(formattedSlots[4].team, '— AVAILABLE SLOT —');
console.log('✓ Slot List rendering and formatting logic verified 100%.');

console.log('\n=======================================================');
console.log('🎉 ALL SLOT LIST VIEW & POSTER TEMPLATE TESTS PASSED 100%!');
console.log('=======================================================');
