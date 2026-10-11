// Unit Test for Prompt 7: Match Editing & Correction System
const assert = require('assert');

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

console.log("Running Prompt 7 Match Editing & Correction System Tests...");

const PLACEMENT_POINTS = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 0,
  12: 0
};

function calculateTeamMatchScore(placement, kills) {
  const p = parseInt(placement, 10);
  const k = parseInt(kills, 10) || 0;
  const placementPoints = PLACEMENT_POINTS[p] !== undefined ? PLACEMENT_POINTS[p] : 0;
  const killPoints = Math.max(0, k);
  return {
    placementPoints,
    killPoints,
    totalPoints: placementPoints + killPoints
  };
}

function calculateCumulativeStats(state) {
  const teamsMap = {};
  state.teams.forEach((t) => {
    teamsMap[t] = {
      teamName: t,
      totalPoints: 0,
      placementPoints: 0,
      eliminationPoints: 0,
      matchesPlayed: 0
    };
  });

  state.matches.forEach((m) => {
    if (!m.isSaved) return;
    m.teamData.forEach((td) => {
      const stats = teamsMap[td.teamName];
      if (!stats) return;
      const score = calculateTeamMatchScore(td.placement, td.kills);
      stats.placementPoints += score.placementPoints;
      stats.eliminationPoints += score.killPoints;
      stats.totalPoints += score.totalPoints;
      stats.matchesPlayed += 1;
    });
  });

  return Object.values(teamsMap).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.eliminationPoints - a.eliminationPoints; // Tie-breaker: total kills
  });
}

// 1. Initial State with 2 Completed Matches
const state = {
  tournamentTitle: "NZ PAID SCRIMS",
  totalMatches: 3,
  teams: [
    "ALPHA", "BRAVO", "CHARLIE", "DELTA",
    "ECHO", "FOXTROT", "GOLF", "HOTEL",
    "INDIA", "JULIET", "KILO", "LIMA"
  ],
  matches: [
    {
      matchNumber: 1,
      isSaved: true,
      teamData: [
        { teamName: "ALPHA", placement: 1, kills: 10 }, // 12 + 10 = 22
        { teamName: "BRAVO", placement: 2, kills: 4 },  // 9 + 4 = 13
        { teamName: "CHARLIE", placement: 3, kills: 2 },// 8 + 2 = 10
        { teamName: "DELTA", placement: 4, kills: 0 },
        { teamName: "ECHO", placement: 5, kills: 0 },
        { teamName: "FOXTROT", placement: 6, kills: 0 },
        { teamName: "GOLF", placement: 7, kills: 0 },
        { teamName: "HOTEL", placement: 8, kills: 0 },
        { teamName: "INDIA", placement: 9, kills: 0 },
        { teamName: "JULIET", placement: 10, kills: 0 },
        { teamName: "KILO", placement: 11, kills: 0 },
        { teamName: "LIMA", placement: 12, kills: 0 }
      ]
    },
    {
      matchNumber: 2,
      isSaved: true,
      teamData: [
        { teamName: "BRAVO", placement: 1, kills: 8 },  // 12 + 8 = 20
        { teamName: "ALPHA", placement: 2, kills: 2 },  // 9 + 2 = 11
        { teamName: "CHARLIE", placement: 3, kills: 1 },// 8 + 1 = 9
        { teamName: "DELTA", placement: 4, kills: 0 },
        { teamName: "ECHO", placement: 5, kills: 0 },
        { teamName: "FOXTROT", placement: 6, kills: 0 },
        { teamName: "GOLF", placement: 7, kills: 0 },
        { teamName: "HOTEL", placement: 8, kills: 0 },
        { teamName: "INDIA", placement: 9, kills: 0 },
        { teamName: "JULIET", placement: 10, kills: 0 },
        { teamName: "KILO", placement: 11, kills: 0 },
        { teamName: "LIMA", placement: 12, kills: 0 }
      ]
    },
    {
      matchNumber: 3,
      isSaved: false,
      teamData: []
    }
  ]
};

// Check Initial Leaderboard
let standings = calculateCumulativeStats(state);
assert.strictEqual(standings[0].teamName, "ALPHA", "ALPHA should be rank 1 initially (22 + 11 = 33 pts)");
assert.strictEqual(standings[0].totalPoints, 33);
assert.strictEqual(standings[1].teamName, "BRAVO", "BRAVO should be rank 2 initially (13 + 20 = 33 pts, tie-breaker kills 12 vs 12)");
console.log("✓ Initial standings verified: ALPHA (33 pts, 12 kills), BRAVO (33 pts, 12 kills).");

// 2. Perform Edit / Correction on Match 1:
// Admin corrects Match 1: BRAVO actually got 8 kills instead of 4 (a typo was made during match 1 entry)
console.log("Simulating admin reopening Match 1 and correcting BRAVO's kills from 4 to 8...");

// Find BRAVO in match 1
const bravoMatch1 = state.matches[0].teamData.find(t => t.teamName === "BRAVO");
bravoMatch1.kills = 8; // was 4

// Assert Match 2 was NOT altered
const bravoMatch2 = state.matches[1].teamData.find(t => t.teamName === "BRAVO");
assert.strictEqual(bravoMatch2.kills, 8, "Match 2 BRAVO kills remain intact");
const alphaMatch2 = state.matches[1].teamData.find(t => t.teamName === "ALPHA");
assert.strictEqual(alphaMatch2.kills, 2, "Match 2 ALPHA kills remain intact");

// 3. Recalculate Standings without restarting tournament
standings = calculateCumulativeStats(state);

// BRAVO new total = (Match 1: 9 + 8 = 17) + (Match 2: 12 + 8 = 20) = 37 pts
const updatedBravo = standings.find(t => t.teamName === "BRAVO");
assert.strictEqual(updatedBravo.totalPoints, 37, "BRAVO should now have 37 total points");
assert.strictEqual(updatedBravo.eliminationPoints, 16, "BRAVO should have 16 total kills");

// ALPHA remains at 33 pts
const updatedAlpha = standings.find(t => t.teamName === "ALPHA");
assert.strictEqual(updatedAlpha.totalPoints, 33, "ALPHA should remain at 33 points");

// BRAVO has surpassed ALPHA and is now Rank 1!
assert.strictEqual(standings[0].teamName, "BRAVO", "BRAVO must now be Rank 1 after correction");
assert.strictEqual(standings[1].teamName, "ALPHA", "ALPHA is now Rank 2");
console.log("✓ Recalculated standings verified: BRAVO took #1 with 37 points without restarting the tournament.");

// 4. Test Placement Swap Correction on Match 2:
// Admin corrects placement typo in Match 2: DELTA was #3 and CHARLIE was #4
console.log("Simulating placement swap correction in Match 2 between CHARLIE and DELTA...");
const charlieM2 = state.matches[1].teamData.find(t => t.teamName === "CHARLIE");
const deltaM2 = state.matches[1].teamData.find(t => t.teamName === "DELTA");
charlieM2.placement = 4; // was 3 (7 pts instead of 8 pts)
deltaM2.placement = 3;   // was 4 (8 pts instead of 7 pts)

standings = calculateCumulativeStats(state);
const updatedCharlie = standings.find(t => t.teamName === "CHARLIE");
const updatedDelta = standings.find(t => t.teamName === "DELTA");

// CHARLIE: Match 1 = 8 + 2 = 10, Match 2 = 7 + 1 = 8 -> Total 18 pts
assert.strictEqual(updatedCharlie.totalPoints, 18, "CHARLIE total points adjusted to 18");
// DELTA: Match 1 = 7 + 0 = 7, Match 2 = 8 + 0 = 8 -> Total 15 pts
assert.strictEqual(updatedDelta.totalPoints, 15, "DELTA total points adjusted to 15");
console.log("✓ Placement correction verified: Points dynamically adjusted.");

// 5. Save corrected state to localStorage & verify persistence
const STORAGE_KEY = "ff_tournament_calculator_state";
localStorageMock.setItem(STORAGE_KEY, JSON.stringify(state));
const restored = JSON.parse(localStorageMock.getItem(STORAGE_KEY));
assert.strictEqual(restored.matches[0].teamData.find(t => t.teamName === "BRAVO").kills, 8);
assert.strictEqual(restored.matches[1].teamData.find(t => t.teamName === "DELTA").placement, 3);
console.log("✓ Corrected data persisted to localStorage properly.");

console.log("\n=======================================================");
console.log("🎉 ALL PROMPT 7 MATCH EDITING & CORRECTION TESTS PASSED!");
console.log("=======================================================");
