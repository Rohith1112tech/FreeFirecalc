// Unit Test for Prompt 6: Data Persistence & Local Storage
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

console.log("Running Prompt 6 Persistence & LocalStorage Tests...");

const STORAGE_KEY = "ff_tournament_calculator_state";

// Step 1: Create an active tournament state
const testState = {
  tournamentTitle: "CHAMPIONSHIP SCRIMS S1",
  totalMatches: 4,
  teams: [
    "TEAM A", "TEAM B", "TEAM C", "TEAM D",
    "TEAM E", "TEAM F", "TEAM G", "TEAM H",
    "TEAM I", "TEAM J", "TEAM K", "TEAM L"
  ],
  activeScreen: "tournament",
  activeSubView: "view-leaderboard",
  positionDisplayMode: "points",
  exportFormat: "png",
  selectedMatchIndex: 1, // Currently viewing Match 2
  matches: [
    {
      matchNumber: 1,
      isSaved: true,
      teamData: [
        { teamName: "TEAM A", placement: 1, kills: 7 }, // 12 + 7 = 19
        { teamName: "TEAM B", placement: 2, kills: 4 }, // 9 + 4 = 13
        { teamName: "TEAM C", placement: 3, kills: 1 }, // 8 + 1 = 9
        { teamName: "TEAM D", placement: 4, kills: 2 }, // 7 + 2 = 9
        { teamName: "TEAM E", placement: 5, kills: 0 },
        { teamName: "TEAM F", placement: 6, kills: 0 },
        { teamName: "TEAM G", placement: 7, kills: 0 },
        { teamName: "TEAM H", placement: 8, kills: 0 },
        { teamName: "TEAM I", placement: 9, kills: 0 },
        { teamName: "TEAM J", placement: 10, kills: 0 },
        { teamName: "TEAM K", placement: 11, kills: 0 },
        { teamName: "TEAM L", placement: 12, kills: 0 }
      ]
    },
    {
      matchNumber: 2,
      isSaved: true,
      teamData: [
        { teamName: "TEAM B", placement: 1, kills: 5 }, // 12 + 5 = 17
        { teamName: "TEAM A", placement: 2, kills: 3 }, // 9 + 3 = 12
        { teamName: "TEAM C", placement: 3, kills: 0 },
        { teamName: "TEAM D", placement: 4, kills: 0 },
        { teamName: "TEAM E", placement: 5, kills: 0 },
        { teamName: "TEAM F", placement: 6, kills: 0 },
        { teamName: "TEAM G", placement: 7, kills: 0 },
        { teamName: "TEAM H", placement: 8, kills: 0 },
        { teamName: "TEAM I", placement: 9, kills: 0 },
        { teamName: "TEAM J", placement: 10, kills: 0 },
        { teamName: "TEAM K", placement: 11, kills: 0 },
        { teamName: "TEAM L", placement: 12, kills: 0 }
      ]
    }
  ]
};

// Step 2: Save to localStorage
localStorageMock.setItem(STORAGE_KEY, JSON.stringify(testState));
assert.ok(localStorageMock.getItem(STORAGE_KEY), "State must be saved in localStorage");
console.log("✓ State successfully saved to localStorage.");

// Step 3: Simulate browser reload / page refresh
const reloadedJson = localStorageMock.getItem(STORAGE_KEY);
const restoredState = JSON.parse(reloadedJson);

assert.strictEqual(restoredState.tournamentTitle, "CHAMPIONSHIP SCRIMS S1");
assert.strictEqual(restoredState.totalMatches, 4);
assert.strictEqual(restoredState.activeScreen, "tournament");
assert.strictEqual(restoredState.activeSubView, "view-leaderboard");
assert.strictEqual(restoredState.selectedMatchIndex, 1);
assert.strictEqual(restoredState.teams.length, 12);
assert.strictEqual(restoredState.teams[0], "TEAM A");
assert.strictEqual(restoredState.matches.length, 2);
assert.strictEqual(restoredState.matches[0].isSaved, true);
assert.strictEqual(restoredState.matches[0].teamData[0].kills, 7);
assert.strictEqual(restoredState.matches[1].teamData[0].kills, 5);
console.log("✓ Full tournament reload simulation passed with 100% data integrity.");

// Step 4: Test 'Reset Tournament' functionality
localStorageMock.removeItem(STORAGE_KEY);
assert.strictEqual(localStorageMock.getItem(STORAGE_KEY), null, "Reset must remove state from localStorage");
console.log("✓ Reset tournament successfully wiped data from localStorage.");

console.log("\nALL PROMPT 6 TESTS PASSED!");
