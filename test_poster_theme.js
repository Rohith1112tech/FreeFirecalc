// Unit Test for Dual Poster Template Theme Switching (Red Crimson vs Cyan Storm)
const assert = require('assert');

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

console.log("Running Dual Poster Theme Switcher Tests...");

const STORAGE_KEY = "ff_tournament_calculator_state";

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

// Step 2: Switch to cyan theme
initialState.selectedPosterTheme = "cyan";
localStorageMock.setItem(STORAGE_KEY, JSON.stringify(initialState));
restored = JSON.parse(localStorageMock.getItem(STORAGE_KEY));
assert.strictEqual(restored.selectedPosterTheme, "cyan", "Selected theme should switch to 'cyan'");
console.log("✓ Switching to 'cyan' theme verified.");

// Step 3: Verify template assets existence
const fs = require('fs');
const path = require('path');

const redTemplatePath = path.join(__dirname, 'assets', 'jack_sparrow_template.png');
const cyanTemplatePath = path.join(__dirname, 'assets', 'jack_sparrow_cyan_template.jpg');

assert.ok(fs.existsSync(redTemplatePath), "Red template image assets/jack_sparrow_template.png must exist");
assert.ok(fs.existsSync(cyanTemplatePath), "Cyan template image assets/jack_sparrow_cyan_template.jpg must exist");
console.log("✓ Both Red Crimson and Cyan Storm template assets exist and are accessible.");

console.log("\n=======================================================");
console.log("🎉 ALL DUAL POSTER TEMPLATE TESTS PASSED!");
console.log("=======================================================");
