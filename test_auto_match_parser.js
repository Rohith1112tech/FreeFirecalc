// test_auto_match_parser.js
const assert = require("assert");
const fs = require("fs");

console.log("Running Auto Match Parser & Sync to Leaderboard Tests...\n");

const appJs = fs.readFileSync("app.js", "utf8");

const PLACEMENT_POINTS = {
  1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
};

// Extract extractMatchSection & parseMatchResultsTable
const extractFuncRegex = /function extractMatchSection\([\s\S]*?\n\}/;
const extractFuncMatch = appJs.match(extractFuncRegex);
assert(extractFuncMatch, "extractMatchSection function must be defined in app.js");

const parseFuncRegex = /function parseMatchResultsTable\([\s\S]*?\n\}/;
const parseFuncMatch = appJs.match(parseFuncRegex);
assert(parseFuncMatch, "parseMatchResultsTable function must be defined in app.js");

const parseSlotRegex = /function parseSlotList\([\s\S]*?\n\}/;
const parseSlotMatch = appJs.match(parseSlotRegex);
assert(parseSlotMatch, "parseSlotList function must be defined in app.js");

const { extractMatchSection, parseMatchResultsTable, parseSlotList } = new Function("PLACEMENT_POINTS", `
  ${extractFuncMatch[0]}
  ${parseFuncMatch[0]}
  ${parseSlotMatch[0]}
  return { extractMatchSection, parseMatchResultsTable, parseSlotList };
`)(PLACEMENT_POINTS);

// Test 1: User's exact sample table
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

// Test 2: Gemini Full Prompt Text (Multi-match M1, M2, M3, M4 with slots and artifacts)
const geminiFullText = `TEAM LIST ✨✨

Wrz eSports
Tபி KNIGHTS
3.MOBILE JODZ
4.Skyline esports
5.Sheru bhai
6. CK-4K
7. Rk Falcons
8. Tபி SPARTANZ
9. Akm eSports
10. Jd E-Sports
11. Syndicate
12 Jack sparrow 

Slot 1 - Wrz eSports: F2W PANEL✓, Shanks.11, Wrz.Deso28!, Wrz.krish04!   
image_8ac428.jpg

Slot 2 - Tபி KNIGHTS: Tபி REXON !!, Tபி MARCO !!, TN ERROR, CL BEAST   
image_8ac428.jpg

Slot 3 - MOBILE JODZ: SPARK 모, அJU GAMING 모, HI+LEЯ, SPARK 모   
image_8ac428.jpg

Slot 4 - Skyline esports: z x u z_7, doraemon_jk, TG MAFIA !, TG MESSI !   
image_8ac428.jpg

Slot 5 - Sheru bhai: ??SURESH??, DHANUSH, BLACK_GOKU, LOGU♡..   
image_8ac441.jpg

Slot 6 - CK-4K: CK X FINIX, CK X V4XY, MR_V4_K!ĐØ_, CK_DEVIL   
image_8ac441.jpg

Slot 7 - Rk Falcons: RK.Abrox, Rk.Scooby18!, Madaraa, RK.Astro   
image_8ac441.jpg

Slot 8 - Tபி SPARTANZ: Tபி EREN, Blazeunfair!, Tபி ASURAN !, S1X ! JACK   
image_8ac441.jpg

Slot 9 - Akm eSports: SG INNOCENT?, STR SHANKS, BuNNy !!!, AGENT...V   
image_8ac445.jpg

Slot 10 - Jd E-Sports: OTK LIVE 모, PRIME⁷⁷ 모, JD Chan.22, SRP KISHORE   
image_8ac445.jpg

Slot 11 - Syndicate: Syn.Shadow, THADI_Ø, Syn.Frost, Syn.Asalt   
image_8ac445.jpg

Slot 12 - Jack sparrow: Js.Pokemon, Js.Suzie, Js.Alien11!, Js.Culprit8!   
image_8ac445.jpg

M1

Rank	Team Name	Match Pos	Place Pts	Eliminations	Total Points
1	Tபி SPARTANZ	1st	12	20	32
2	Wrz eSports	4th	7	16	23
3	Jack sparrow	3rd	8	15	23
4	Akm eSports	5th	6	8	14
5	CK-4K	2nd	9	5	14
6	Syndicate	8th	3	7	10
7	Skyline esports	11th	0	9	9
8	Rk Falcons	7th	4	5	9
9	Jd E-Sports	6th	5	3	8
10	Tபி KNIGHTS	10th	1	4	5
11	MOBILE JODZ	9th	2	1	3
12	Sheru bhai	12th	0	2	2
(Calculated from the Match 1 screenshots. Tie-breakers on kills: Wrz eSports (16) over Jack sparrow (15)...)   
image_8bb3e4.jpg
+ 3

M2

Match 2 (M2) Leaderboard
Rank	Team Name	Match Pos	Place Pts	Eliminations	M2 Points
1	Wrz eSports	1st	12	13	25
2	Akm eSports	5th	6	17	23
3	Rk Falcons	2nd	9	11	20
4	Tபி KNIGHTS	4th	7	9	16
5	MOBILE JODZ	3rd	8	5	13
6	Jd E-Sports	6th	5	6	11
7	Syndicate	8th	3	7	10
8	Sheru bhai	7th	4	3	7
9	Tபி SPARTANZ	10th	1	5	6
10	Jack sparrow	9th	2	2	4
11	CK-4K	12th	0	1	1
12	Skyline esports	11th	0	0	0
(Calculated from the Match 2 screenshots)   
image_8bb40a.jpg
+ 1

M3

Match 3 (M3) Leaderboard
Rank	Team Name	Match Pos	Place Pts	Eliminations	M3 Points
1	Akm eSports	1st	12	18	30
2	Jack sparrow	3rd	8	15	23
3	Rk Falcons	5th	6	14	20
4	Tபி SPARTANZ	4th	7	11	18
5	Wrz eSports	7th	4	11	15
6	Jd E-Sports	2nd	9	3	12
7	Skyline esports	11th	0	7	7
8	Tபி KNIGHTS	8th	3	4	7
9	Sheru bhai	6th	5	1	6
10	Syndicate	12th	0	4	4
11	CK-4K	10th	1	2	3
12	MOBILE JODZ	9th	2	1	3
(Calculated from the Match 3 screenshots...)   
image_8bb789.jpg
+ 3

M4

Match 4 (M4) Leaderboard
Rank	Team Name	Match Pos	Place Pts	Eliminations	M4 Points
1	Wrz eSports	1st	12	22	34
2	Tபி SPARTANZ	3rd	8	14	22
3	Rk Falcons	4th	7	13	20
4	Jack sparrow	8th	3	12	15
5	Syndicate	6th	5	10	15
6	MOBILE JODZ	5th	6	9	15
7	Jd E-Sports	2nd	9	4	13
8	Skyline esports	9th	2	4	6
9	Sheru bhai	7th	4	1	5
10	Tபி KNIGHTS	10th	1	1	2
11	Akm eSports	-	0	0	0
12	CK-4K	-	0	0	0
(Calculated from the Match 4 screenshots...)   
image_8c85c5.jpg
+ 4`;

// Verify Slot Parsing from Gemini text
const parsedSlots = parseSlotList(geminiFullText);
assert.strictEqual(Object.keys(parsedSlots).length, 12, "Must parse all 12 slots");
assert.strictEqual(parsedSlots[1].teamName, "Wrz eSports");
assert.strictEqual(parsedSlots[1].players.length, 4);
assert.strictEqual(parsedSlots[1].players[0], "F2W PANEL✓");
assert.strictEqual(parsedSlots[2].teamName, "Tபி KNIGHTS");
assert.strictEqual(parsedSlots[8].teamName, "Tபி SPARTANZ");
console.log("✓ Gemini slot format with unicode/Tamil and image filtering verified 100%.");

// Verify Multi-Match Parsing
const m1Res = parseMatchResultsTable(geminiFullText, 1);
assert.strictEqual(m1Res.success, true);
assert.strictEqual(m1Res.rows.length, 12, "Match 1 must have 12 rows");
assert.strictEqual(m1Res.rows[0].teamName, "Tபி SPARTANZ");
assert.strictEqual(m1Res.rows[0].placement, 1);
assert.strictEqual(m1Res.rows[0].totalPoints, 32);

const m4Res = parseMatchResultsTable(geminiFullText, 4);
assert.strictEqual(m4Res.success, true);
assert.strictEqual(m4Res.rows.length, 12, "Match 4 must have all 12 rows including '-' rank");
assert.strictEqual(m4Res.rows[10].teamName, "AKM ESPORTS");
assert.strictEqual(m4Res.rows[10].totalPoints, 0);
assert.strictEqual(m4Res.rows[11].teamName, "CK-4K");
assert.strictEqual(m4Res.rows[11].totalPoints, 0);

console.log("✓ All 4 matches extracted accurately from complete Gemini output.");

// Verify Cumulative 4-Match Standings
const cumulative = {};
for (let m = 1; m <= 4; m++) {
  const matchRows = parseMatchResultsTable(geminiFullText, m).rows;
  matchRows.forEach(r => {
    const k = r.teamName;
    if (!cumulative[k]) cumulative[k] = { teamName: k, booyahs: 0, placePts: 0, kills: 0, total: 0 };
    if (r.placement === 1) cumulative[k].booyahs++;
    cumulative[k].placePts += r.placementPoints;
    cumulative[k].kills += r.kills;
    cumulative[k].total += r.totalPoints;
  });
}

const finalStandings = Object.values(cumulative).sort((a, b) => {
  if (b.total !== a.total) return b.total - a.total;
  if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
  if (b.kills !== a.kills) return b.kills - a.kills;
  return b.placePts - a.placePts;
});

assert.strictEqual(finalStandings[0].teamName, "WRZ ESPORTS");
assert.strictEqual(finalStandings[0].total, 97);
assert.strictEqual(finalStandings[1].teamName, "Tபி SPARTANZ");
assert.strictEqual(finalStandings[1].total, 78);
assert.strictEqual(finalStandings[2].teamName, "RK FALCONS");
assert.strictEqual(finalStandings[2].total, 69);

console.log("✓ Cumulative tournament standings (97 pts, 78 pts, 69 pts) match Gemini output with 100% precision.");

console.log("\n=======================================================");
console.log("🎉 ALL GEMINI & AUTO MATCH PARSER TESTS PASSED 100%!");
console.log("=======================================================");
