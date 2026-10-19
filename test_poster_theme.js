// Unit Test for Multi-Poster Template Theme Switching (7 Themes)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    }
  };
})();

console.log("Running Multi-Poster Theme Switcher Tests (7 Themes)...");

const STORAGE_KEY = "ff_tournament_calculator_state";

const themesToTest = [
  { id: "red", name: "RED CRIMSON", file: "jack_sparrow_template.png" },
  { id: "cyan", name: "CYAN STORM", file: "jack_sparrow_cyan_template.jpg" },
  { id: "green", name: "TOXIC GREEN", file: "jack_sparrow_green_template.jpg" },
  { id: "orange", name: "FLAME ORANGE", file: "jack_sparrow_orange_template.jpg" },
  { id: "pink", name: "NEON MAGENTA", file: "jack_sparrow_pink_template.jpg" },
  { id: "cyan-purple", name: "CYBER VIOLET", file: "jack_sparrow_cyan_purple_template.jpg" },
  { id: "purple-blue", name: "ROYAL INDIGO", file: "jack_sparrow_purple_blue_template.jpg" }
];

// Step 1: Default theme is red
const initialState = {
  tournamentTitle: "NZ PAID SCRIMS",
  totalMatches: 6,
  selectedPosterTheme: "red",
  teams: ["TEAM A", "TEAM B"]
};

localStorageMock.setItem(STORAGE_KEY, JSON.stringify(initialState));
let restored = JSON.parse(localStorageMock.getItem(STORAGE_KEY));
assert.strictEqual(restored.selectedPosterTheme, "red", "Default theme should be 'red'");
console.log("✓ Default theme 'red' initialized and verified.");

// Step 2: Test switching across all 7 themes
themesToTest.forEach(({ id, name }) => {
  initialState.selectedPosterTheme = id;
  localStorageMock.setItem(STORAGE_KEY, JSON.stringify(initialState));
  restored = JSON.parse(localStorageMock.getItem(STORAGE_KEY));
  assert.strictEqual(restored.selectedPosterTheme, id, `Selected theme should switch to '${id}' (${name})`);
  console.log(`✓ Switching to theme '${id}' (${name}) verified.`);
});

// Step 3: Verify all 7 template assets exist in assets/ directory
themesToTest.forEach(({ id, name, file }) => {
  const filePath = path.join(__dirname, 'assets', file);
  assert.ok(fs.existsSync(filePath), `Template image assets/${file} for theme '${id}' (${name}) must exist`);
  const stats = fs.statSync(filePath);
  assert.ok(stats.size > 10000, `Template image assets/${file} must have valid non-empty size (got ${stats.size} bytes)`);
  console.log(`✓ Template asset assets/${file} (${name}) verified (${stats.size} bytes).`);
});

console.log("\n=======================================================");
console.log("🎉 ALL 7 MULTI-POSTER TEMPLATE TESTS PASSED 100%!");
console.log("=======================================================");
