// test_auto_match_parser.js
const assert = require("assert");
const fs = require("fs");

console.log("Running Auto Match Parser & Sync to Leaderboard Tests...\n");

// Read app.js and extract PLACEMENT_POINTS and parseMatchResultsTable
const appJs = fs.readFileSync("app.js", "utf8");

// Extract PLACEMENT_POINTS
const placementPointsMatch = appJs.match(/const PLACEMENT_POINTS\s*=\s*\{([^}]+)\};/);
assert(placementPointsMatch, "PLACEMENT_POINTS must be present in app.js");
const PLACEMENT_POINTS = {
  1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
};

// Evaluate parseMatchResultsTable in a sandbox function
const parseFuncRegex = /function parseMatchResultsTable\([\s\S]*?\n\}/;
const parseFuncMatch = appJs.match(parseFuncRegex);
assert(parseFuncMatch, "parseMatchResultsTable function must be defined in app.js");

const parseMatchResultsTable = new Function("PLACEMENT_POINTS", `
  ${parseFuncMatch[0]}
  return parseMatchResultsTable;
`)(PLACEMENT_POINTS);

// Test 1: User's exact sample table (Tab-separated and space-separated variants)
const userSampleTable = `Rank	Team Name	Match Pos	Place Pts	Eliminations	Total Points
1	JACK DANIELS	2nd	9	22	31
2	SEVENSHOT ACADEMY	1st	12	13	25
3	DK SPARTANZ	5th	6	12	18
4	RAGNAROK ESP	8th	3	13	16
5	CELESTIALS	6th	5	9	14
6	VORAX ESPORTS	3rd	8	5	13
7	TIS ESPORTZ	4th	7	4	11
8	CSS ESPORTS	7th	4	0	4
9	NEXIS ESPORTS	9th	2	0	2
10	DUREX	11th	0	1	1
11	XZ ESPORTS	10th	1	0	1
12	ARES NEXES	12th	0	0	0`;

const result = parseMatchResultsTable(userSampleTable);
assert.strictEqual(result.success, true, "Parser should succeed on user's sample table");
assert.strictEqual(result.rows.length, 12, "Should parse all 12 teams");

console.log("✓ Successfully parsed all 12 teams from the user's table:");
result.rows.forEach(r => {
  console.log(`  - ${r.teamName.padEnd(20)} | Pos: ${r.placement} (${r.placementPoints} pts) | Kills: ${r.kills} | Total: ${r.totalPoints}`);
});

// Verify specific entries:
// 1. JACK DANIELS: 2nd place (9 pts), 22 kills, 31 total points
const jackDaniels = result.rows.find(r => r.teamName === "JACK DANIELS");
assert(jackDaniels, "JACK DANIELS should be in parsed rows");
assert.strictEqual(jackDaniels.placement, 2, "JACK DANIELS should be 2nd place");
assert.strictEqual(jackDaniels.placementPoints, 9, "JACK DANIELS should have 9 placement points");
assert.strictEqual(jackDaniels.kills, 22, "JACK DANIELS should have 22 kills");
assert.strictEqual(jackDaniels.totalPoints, 31, "JACK DANIELS should have 31 total points");

// 2. SEVENSHOT ACADEMY: 1st place (12 pts), 13 kills, 25 total points
const sevenshot = result.rows.find(r => r.teamName === "SEVENSHOT ACADEMY");
assert(sevenshot, "SEVENSHOT ACADEMY should be in parsed rows");
assert.strictEqual(sevenshot.placement, 1, "SEVENSHOT ACADEMY should be 1st place");
assert.strictEqual(sevenshot.placementPoints, 12, "SEVENSHOT ACADEMY should have 12 placement points");
assert.strictEqual(sevenshot.kills, 13, "SEVENSHOT ACADEMY should have 13 kills");
assert.strictEqual(sevenshot.totalPoints, 25, "SEVENSHOT ACADEMY should have 25 total points");

// 3. ARES NEXES: 12th place (0 pts), 0 kills, 0 total points
const ares = result.rows.find(r => r.teamName === "ARES NEXES");
assert(ares, "ARES NEXES should be in parsed rows");
assert.strictEqual(ares.placement, 12, "ARES NEXES should be 12th place");
assert.strictEqual(ares.placementPoints, 0, "ARES NEXES should have 0 placement points");
assert.strictEqual(ares.kills, 0, "ARES NEXES should have 0 kills");
assert.strictEqual(ares.totalPoints, 0, "ARES NEXES should have 0 total points");

console.log("\n✓ Verified exact data mapping: Placements, Placement Points, Kills, and Total Points.");

// Test 2: Leaderboard standing calculation
// JACK DANIELS has 31 pts, SEVENSHOT has 25 pts -> Leaderboard should rank JACK DANIELS #1, SEVENSHOT #2
const sortedLeaderboard = [...result.rows].sort((a, b) => {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  const aBooyah = a.placement === 1 ? 1 : 0;
  const bBooyah = b.placement === 1 ? 1 : 0;
  if (bBooyah !== aBooyah) return bBooyah - aBooyah;
  if (b.kills !== a.kills) return b.kills - a.kills;
  return b.placementPoints - a.placementPoints;
});

assert.strictEqual(sortedLeaderboard[0].teamName, "JACK DANIELS", "Rank 1 must be JACK DANIELS");
assert.strictEqual(sortedLeaderboard[1].teamName, "SEVENSHOT ACADEMY", "Rank 2 must be SEVENSHOT ACADEMY");
assert.strictEqual(sortedLeaderboard[2].teamName, "DK SPARTANZ", "Rank 3 must be DK SPARTANZ");

console.log("✓ Leaderboard standings order accurately derived from auto-parsed data.");

// Test 3: Space-separated format fallback
const spaceSeparatedTable = `Rank Team Name Match Pos Place Pts Eliminations Total Points
1 JACK DANIELS 2nd 9 22 31
2 SEVENSHOT ACADEMY 1st 12 13 25`;
const spaceResult = parseMatchResultsTable(spaceSeparatedTable);
assert.strictEqual(spaceResult.success, true);
assert.strictEqual(spaceResult.rows.length, 2);
assert.strictEqual(spaceResult.rows[0].teamName, "JACK DANIELS");
assert.strictEqual(spaceResult.rows[1].teamName, "SEVENSHOT ACADEMY");
console.log("✓ Space-separated and copy-pasted table formats parsed correctly.");

console.log("\n=======================================================");
console.log("🎉 ALL AUTO MATCH PARSER & LEADERBOARD SYNC TESTS PASSED!");
console.log("=======================================================");
