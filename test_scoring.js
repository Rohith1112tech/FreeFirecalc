// Unit Test for Free Fire Points Calculation Logic (Prompt 3)
const assert = require('assert');

const PLACEMENT_POINTS = {
  1: 12, // 1st: 12 pts
  2: 9,  // 2nd: 9 pts
  3: 8,  // 3rd: 8 pts
  4: 7,  // 4th: 7 pts
  5: 6,  // 5th: 6 pts
  6: 5,  // 6th: 5 pts
  7: 4,  // 7th: 4 pts
  8: 3,  // 8th: 3 pts
  9: 2,  // 9th: 2 pts
  10: 1, // 10th: 1 pt
  11: 0, // 11th: 0 pts
  12: 0  // 12th: 0 pts
};

function getPlacementPoints(placement) {
  const p = parseInt(placement, 10);
  return PLACEMENT_POINTS[p] !== undefined ? PLACEMENT_POINTS[p] : 0;
}

function getKillPoints(kills) {
  const k = parseInt(kills, 10);
  return (isNaN(k) || k < 0) ? 0 : k;
}

function calculateMatchScore(placement, kills) {
  const placePts = getPlacementPoints(placement);
  const killPts = getKillPoints(kills);
  return {
    placementPoints: placePts,
    killPoints: killPts,
    totalPoints: placePts + killPts
  };
}

console.log("Running Prompt 3 Scoring Tests...");

// Test 1: Placement points verification
assert.strictEqual(getPlacementPoints(1), 12, "1st place must be 12 pts");
assert.strictEqual(getPlacementPoints(2), 9, "2nd place must be 9 pts");
assert.strictEqual(getPlacementPoints(3), 8, "3rd place must be 8 pts");
assert.strictEqual(getPlacementPoints(4), 7, "4th place must be 7 pts");
assert.strictEqual(getPlacementPoints(5), 6, "5th place must be 6 pts");
assert.strictEqual(getPlacementPoints(6), 5, "6th place must be 5 pts");
assert.strictEqual(getPlacementPoints(7), 4, "7th place must be 4 pts");
assert.strictEqual(getPlacementPoints(8), 3, "8th place must be 3 pts");
assert.strictEqual(getPlacementPoints(9), 2, "9th place must be 2 pts");
assert.strictEqual(getPlacementPoints(10), 1, "10th place must be 1 pt");
assert.strictEqual(getPlacementPoints(11), 0, "11th place must be 0 pts");
assert.strictEqual(getPlacementPoints(12), 0, "12th place must be 0 pts");
console.log("✓ All 12 placement point rules verified.");

// Test 2: Kill points (1 pt per kill)
assert.strictEqual(getKillPoints(0), 0);
assert.strictEqual(getKillPoints(5), 5);
assert.strictEqual(getKillPoints(14), 14);
console.log("✓ Kill points (1 pt per kill) verified.");

// Test 3: Match total = Placement Points + Kill Points
const matchScore1 = calculateMatchScore(1, 7); // 12 + 7 = 19
assert.strictEqual(matchScore1.placementPoints, 12);
assert.strictEqual(matchScore1.killPoints, 7);
assert.strictEqual(matchScore1.totalPoints, 19);

const matchScore2 = calculateMatchScore(11, 4); // 0 + 4 = 4
assert.strictEqual(matchScore2.placementPoints, 0);
assert.strictEqual(matchScore2.killPoints, 4);
assert.strictEqual(matchScore2.totalPoints, 4);
console.log("✓ Match total formula (Placement + Kills) verified.");

// Test 4: Cumulative calculation across multiple matches
const teamMatches = [
  { placement: 1, kills: 6 }, // 12 + 6 = 18
  { placement: 3, kills: 2 }, // 8 + 2 = 10
  { placement: 5, kills: 4 }, // 6 + 4 = 10
  { placement: 12, kills: 1 } // 0 + 1 = 1
];

let cumPlace = 0;
let cumKill = 0;
let cumTotal = 0;

teamMatches.forEach(m => {
  const s = calculateMatchScore(m.placement, m.kills);
  cumPlace += s.placementPoints;
  cumKill += s.killPoints;
  cumTotal += s.totalPoints;
});

assert.strictEqual(cumPlace, 12 + 8 + 6 + 0, "Cumulative placement points");
assert.strictEqual(cumKill, 6 + 2 + 4 + 1, "Cumulative kill points");
assert.strictEqual(cumTotal, 18 + 10 + 10 + 1, "Cumulative total points");
assert.strictEqual(cumTotal, cumPlace + cumKill, "Cumulative total equals place + kill");

console.log("✓ Cumulative total across matches verified: " + cumTotal + " pts (Place: " + cumPlace + ", Kills: " + cumKill + ")");
console.log("\nALL TESTS PASSED! Scoring logic is 100% compliant with Prompt 3.");
