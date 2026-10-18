// Test Tournament Tie-Breaker Logic: Booyahs (1st) -> Kills (2nd) -> Placements (3rd)
const assert = require('assert');

console.log("Testing Tournament Tie-Breaker Resolution: Booyahs -> Kills -> Placements...");

// Test 1: Booyah breaks tie between equal total points
const teamsBooyahTie = [
  { teamName: "TEAM ALPHA", totalPoints: 30, eliminationPoints: 8, placementPoints: 22, booyahs: 1 },
  { teamName: "TEAM BRAVO", totalPoints: 30, eliminationPoints: 14, placementPoints: 16, booyahs: 0 },
  { teamName: "TEAM CHARLIE", totalPoints: 45, eliminationPoints: 10, placementPoints: 35, booyahs: 2 },
  { teamName: "TEAM DELTA", totalPoints: 20, eliminationPoints: 5, placementPoints: 15, booyahs: 0 }
];

teamsBooyahTie.sort((a, b) => {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
  if (b.eliminationPoints !== a.eliminationPoints) return b.eliminationPoints - a.eliminationPoints;
  return b.placementPoints - a.placementPoints;
});

assert.strictEqual(teamsBooyahTie[0].teamName, "TEAM CHARLIE", "Rank 1: 45 points");
assert.strictEqual(teamsBooyahTie[1].teamName, "TEAM ALPHA", "Team Alpha (1 Booyah) wins tie over Team Bravo (0 Booyahs)");
assert.strictEqual(teamsBooyahTie[2].teamName, "TEAM BRAVO", "Team Bravo has 0 Booyahs");
assert.strictEqual(teamsBooyahTie[3].teamName, "TEAM DELTA", "Rank 4: 20 points");
console.log("✓ Priority 1 (Booyahs) verified: 1 Booyah beats 0 Booyahs on equal points.");

// Test 2: When Booyahs are equal, Kills breaks tie
const teamsKillsTie = [
  { teamName: "TEAM ALPHA", totalPoints: 30, eliminationPoints: 8, placementPoints: 22, booyahs: 1 },
  { teamName: "TEAM BRAVO", totalPoints: 30, eliminationPoints: 14, placementPoints: 16, booyahs: 1 }
];

teamsKillsTie.sort((a, b) => {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
  if (b.eliminationPoints !== a.eliminationPoints) return b.eliminationPoints - a.eliminationPoints;
  return b.placementPoints - a.placementPoints;
});

assert.strictEqual(teamsKillsTie[0].teamName, "TEAM BRAVO", "Team Bravo wins tie due to 14 kills vs 8 kills when Booyahs are tied");
console.log("✓ Priority 2 (Kills) verified: Higher kills breaks tie when Booyahs are equal.");

// Test 3: When Booyahs and Kills are both equal, Placements breaks tie
const teamsPlacementTie = [
  { teamName: "TEAM ALPHA", totalPoints: 30, eliminationPoints: 10, placementPoints: 20, booyahs: 1 },
  { teamName: "TEAM BRAVO", totalPoints: 30, eliminationPoints: 10, placementPoints: 22, booyahs: 1 }
];

teamsPlacementTie.sort((a, b) => {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
  if (b.eliminationPoints !== a.eliminationPoints) return b.eliminationPoints - a.eliminationPoints;
  return b.placementPoints - a.placementPoints;
});

assert.strictEqual(teamsPlacementTie[0].teamName, "TEAM BRAVO", "Team Bravo wins tie due to 22 placement pts vs 20");
console.log("✓ Priority 3 (Placements) verified: Higher placement points breaks tie when Booyahs and Kills are equal.");

console.log("\n=======================================================");
console.log("🎉 ALL TIE-BREAKER HIERARCHY TESTS PASSED!");
console.log("=======================================================");
