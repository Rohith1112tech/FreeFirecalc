// Unit Test for Penalty / Minus Points Deduction System
const assert = require('assert');

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

function getPlacementPoints(placement) {
  const p = parseInt(placement, 10);
  return PLACEMENT_POINTS[p] !== undefined ? PLACEMENT_POINTS[p] : 0;
}

function getKillPoints(kills) {
  const k = parseInt(kills, 10);
  return isNaN(k) || k < 0 ? 0 : k;
}

function getMinusPoints(minus) {
  const m = parseInt(minus, 10);
  return isNaN(m) || m < 0 ? 0 : m;
}

function calculateTeamMatchScore(placement, kills, minus = 0) {
  const placePts = getPlacementPoints(placement);
  const killPts = getKillPoints(kills);
  const minusPts = getMinusPoints(minus);
  return {
    placementPoints: placePts,
    killPoints: killPts,
    minusPoints: minusPts,
    totalPoints: placePts + killPts - minusPts
  };
}

console.log("Running Minus / Penalty Points Deduction Tests...");

// 1. Basic Single Match Score Calculations
const score1 = calculateTeamMatchScore(1, 5, 0); // 12 + 5 - 0 = 17
assert.strictEqual(score1.placementPoints, 12);
assert.strictEqual(score1.killPoints, 5);
assert.strictEqual(score1.minusPoints, 0);
assert.strictEqual(score1.totalPoints, 17, "Default 0 minus points should give 17 pts");
console.log("✓ Default zero minus points verified: 12 + 5 - 0 = 17");

const score2 = calculateTeamMatchScore(1, 5, 3); // 12 + 5 - 3 = 14
assert.strictEqual(score2.placementPoints, 12);
assert.strictEqual(score2.killPoints, 5);
assert.strictEqual(score2.minusPoints, 3);
assert.strictEqual(score2.totalPoints, 14, "Deduction of 3 minus points should give 14 pts");
console.log("✓ Deduction of 3 minus points verified: 12 + 5 - 3 = 14");

const score3 = calculateTeamMatchScore(5, 4, 2); // 6 + 4 - 2 = 8
assert.strictEqual(score3.totalPoints, 8);
console.log("✓ 5th place with 4 kills and 2 minus points verified: 6 + 4 - 2 = 8");

// 2. Edge Cases (Invalid / Negative Input Handling)
const scoreNegativeMinus = calculateTeamMatchScore(2, 6, -5); // should treat -5 as 0
assert.strictEqual(scoreNegativeMinus.minusPoints, 0);
assert.strictEqual(scoreNegativeMinus.totalPoints, 15);
console.log("✓ Negative minus points safely normalized to 0");

const scoreNaNMinus = calculateTeamMatchScore(3, 4, "invalid");
assert.strictEqual(scoreNaNMinus.minusPoints, 0);
assert.strictEqual(scoreNaNMinus.totalPoints, 12);
console.log("✓ Non-numeric string minus input safely normalized to 0");

// 3. Cumulative Multi-Match Tournament Simulation
const teamAData = [
  { match: 1, placement: 1, kills: 7, minus: 2 }, // 12 + 7 - 2 = 17
  { match: 2, placement: 4, kills: 3, minus: 0 }, // 7 + 3 - 0 = 10
  { match: 3, placement: 2, kills: 5, minus: 1 }  // 9 + 5 - 1 = 13
]; // Total: 17 + 10 + 13 = 40 pts, Total Kills: 15, Total Minus: 3

let cumPlaceA = 0;
let cumKillA = 0;
let cumMinusA = 0;
let cumTotalA = 0;

teamAData.forEach((m) => {
  const s = calculateTeamMatchScore(m.placement, m.kills, m.minus);
  cumPlaceA += s.placementPoints;
  cumKillA += s.killPoints;
  cumMinusA += s.minusPoints;
  cumTotalA += s.totalPoints;
});

assert.strictEqual(cumPlaceA, 12 + 7 + 9);
assert.strictEqual(cumKillA, 7 + 3 + 5);
assert.strictEqual(cumMinusA, 2 + 0 + 1);
assert.strictEqual(cumTotalA, 40);
assert.strictEqual(cumTotalA, cumPlaceA + cumKillA - cumMinusA);
console.log(`✓ Cumulative Multi-Match Verified: Team A scored ${cumTotalA} pts (${cumPlaceA} place + ${cumKillA} kills - ${cumMinusA} minus)`);

// 4. Tournament Leaderboard Ranking Impact with Penalties
const tournamentStats = [
  {
    teamName: "TEAM ALPHA",
    placementPoints: 28,
    eliminationPoints: 12,
    minusPoints: 5,
    totalPoints: 28 + 12 - 5, // 35
    booyahs: 1
  },
  {
    teamName: "TEAM BRAVO",
    placementPoints: 24,
    eliminationPoints: 14,
    minusPoints: 0,
    totalPoints: 24 + 14 - 0, // 38
    booyahs: 1
  }
];

tournamentStats.sort((a, b) => {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
  if (b.eliminationPoints !== a.eliminationPoints) return b.eliminationPoints - a.eliminationPoints;
  return b.placementPoints - a.placementPoints;
});

assert.strictEqual(tournamentStats[0].teamName, "TEAM BRAVO", "TEAM BRAVO should be #1 due to higher net points");
assert.strictEqual(tournamentStats[1].teamName, "TEAM ALPHA", "TEAM ALPHA dropped to #2 due to 5 minus points");
console.log("✓ Leaderboard ranking accurately accounts for penalty deductions");

console.log("\n=======================================================");
console.log("🎉 ALL MINUS / PENALTY POINTS DEDUCTION TESTS PASSED 100%!");
console.log("=======================================================");
