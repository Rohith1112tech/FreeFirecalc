// Test Prompt 4 Tie-Breaker Logic: "Tie-breakers should be resolved by total kills."
const assert = require('assert');

const teams = [
  { teamName: "TEAM ALPHA", totalPoints: 30, eliminationPoints: 8, placementPoints: 22, booyahs: 1 },
  { teamName: "TEAM BRAVO", totalPoints: 30, eliminationPoints: 14, placementPoints: 16, booyahs: 0 },
  { teamName: "TEAM CHARLIE", totalPoints: 45, eliminationPoints: 10, placementPoints: 35, booyahs: 2 },
  { teamName: "TEAM DELTA", totalPoints: 20, eliminationPoints: 5, placementPoints: 15, booyahs: 0 }
];

teams.sort((a, b) => {
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }
  // Prompt 4: Tie-breakers should be resolved by total kills (eliminationPoints)
  if (b.eliminationPoints !== a.eliminationPoints) {
    return b.eliminationPoints - a.eliminationPoints;
  }
  if (b.placementPoints !== a.placementPoints) {
    return b.placementPoints - a.placementPoints;
  }
  return b.booyahs - a.booyahs;
});

console.log("Testing Prompt 4 Tie-Breaker Resolution by Total Kills...");

// TEAM CHARLIE has 45 total points -> Rank 1
assert.strictEqual(teams[0].teamName, "TEAM CHARLIE");

// Both TEAM ALPHA and TEAM BRAVO have 30 points.
// TEAM BRAVO has 14 kills vs TEAM ALPHA with 8 kills.
// Therefore, TEAM BRAVO must be Rank 2, and TEAM ALPHA must be Rank 3!
assert.strictEqual(teams[1].teamName, "TEAM BRAVO", "Team Bravo must win tie-breaker due to higher kills");
assert.strictEqual(teams[2].teamName, "TEAM ALPHA", "Team Alpha has fewer kills");

// TEAM DELTA has 20 points -> Rank 4
assert.strictEqual(teams[3].teamName, "TEAM DELTA");

console.log("✓ Tie-breaker test passed successfully! Total kills accurately broke the tie between 30-point teams.");
