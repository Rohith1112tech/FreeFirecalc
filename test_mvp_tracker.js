/**
 * Free Fire Tournament MVP (Most Valuable Player) Tracker Test Suite
 * Tests player kills aggregation, top fragger determination, peak kills, and auto-summing logic.
 */

const assert = require("assert");

console.log("Running MVP (Most Valuable Player) Tracker Tests...\n");

function calculateTournamentMVPFromMatches(matches) {
  const playerStats = {};

  matches.forEach((match) => {
    if (!match || !match.isSaved || !match.teamData) return;

    match.teamData.forEach((tData) => {
      if (!tData || !tData.playerKills) return;
      const teamName = tData.teamName || "UNKNOWN";

      Object.entries(tData.playerKills).forEach(([playerName, kVal]) => {
        const cleanName = playerName ? playerName.trim() : "";
        if (!cleanName) return;
        const kills = parseInt(kVal, 10) || 0;

        if (!playerStats[cleanName]) {
          playerStats[cleanName] = {
            playerName: cleanName,
            teamName: teamName,
            totalKills: 0,
            matchesWithKills: 0,
            maxSingleMatchKills: 0
          };
        }

        playerStats[cleanName].totalKills += kills;
        if (kills > 0) {
          playerStats[cleanName].matchesWithKills += 1;
        }
        if (kills > playerStats[cleanName].maxSingleMatchKills) {
          playerStats[cleanName].maxSingleMatchKills = kills;
        }
      });
    });
  });

  const sortedPlayers = Object.values(playerStats).sort((a, b) => {
    if (b.totalKills !== a.totalKills) {
      return b.totalKills - a.totalKills;
    }
    if (b.maxSingleMatchKills !== a.maxSingleMatchKills) {
      return b.maxSingleMatchKills - a.maxSingleMatchKills;
    }
    return a.playerName.localeCompare(b.playerName);
  });

  const topFragger = sortedPlayers.length > 0 && sortedPlayers[0].totalKills > 0 ? sortedPlayers[0] : null;

  return {
    topFragger,
    leaderboard: sortedPlayers.slice(0, 5),
    totalFraggers: sortedPlayers.length
  };
}

// =========================================================================
// TEST 1: Empty or Unsaved Matches -> Null MVP
// =========================================================================
{
  const emptyMatches = [
    { matchNumber: 1, isSaved: false, teamData: [{ teamName: "ALPHA", kills: 0, playerKills: { "P1": 0 } }] }
  ];
  const res = calculateTournamentMVPFromMatches(emptyMatches);
  assert.strictEqual(res.topFragger, null, "Should return null MVP when no saved matches have kills");
  assert.strictEqual(res.leaderboard.length, 0, "Leaderboard should be empty");
  console.log("✓ Empty/unsaved matches safely return null MVP without crashing.");
}

// =========================================================================
// TEST 2: Multi-Match Aggregation & Top Fragger Determination
// =========================================================================
{
  const matches = [
    {
      matchNumber: 1,
      isSaved: true,
      teamData: [
        {
          teamName: "TEAM EVOS",
          kills: 9,
          playerKills: {
            "Mr05": 5,
            "SAM13": 2,
            "Abu": 1,
            "Street": 1
          }
        },
        {
          teamName: "TOTAL GAMING",
          kills: 6,
          playerKills: {
            "Ajjubhai": 4,
            "FozyAjay": 1,
            "Mafia": 1,
            "Bala": 0
          }
        }
      ]
    },
    {
      matchNumber: 2,
      isSaved: true,
      teamData: [
        {
          teamName: "TEAM EVOS",
          kills: 8,
          playerKills: {
            "Mr05": 6,
            "SAM13": 1,
            "Abu": 1,
            "Street": 0
          }
        },
        {
          teamName: "TOTAL GAMING",
          kills: 7,
          playerKills: {
            "Ajjubhai": 5,
            "FozyAjay": 2,
            "Mafia": 0,
            "Bala": 0
          }
        }
      ]
    }
  ];

  const res = calculateTournamentMVPFromMatches(matches);
  assert.ok(res.topFragger, "Top fragger must exist");
  assert.strictEqual(res.topFragger.playerName, "Mr05", "Mr05 should be the tournament MVP");
  assert.strictEqual(res.topFragger.teamName, "TEAM EVOS", "MVP team must match");
  assert.strictEqual(res.topFragger.totalKills, 11, "Mr05 total kills should be 5 + 6 = 11");
  assert.strictEqual(res.topFragger.maxSingleMatchKills, 6, "Peak kills should be 6");

  // Ajjubhai should be Rank 2
  assert.strictEqual(res.leaderboard[1].playerName, "Ajjubhai");
  assert.strictEqual(res.leaderboard[1].totalKills, 9, "Ajjubhai total kills should be 4 + 5 = 9");

  console.log("✓ Multi-match aggregation and MVP determination verified (Mr05: 11 kills, Ajjubhai: 9 kills).");
}

// =========================================================================
// TEST 3: Tie-breaker on equal total kills -> Highest Peak Single Match Kills
// =========================================================================
{
  const matches = [
    {
      matchNumber: 1,
      isSaved: true,
      teamData: [
        {
          teamName: "TEAM X",
          playerKills: {
            "SniperPro": 8, // Peak 8, total 8
            "SteadyGun": 4  // Peak 4, total 4
          }
        }
      ]
    },
    {
      matchNumber: 2,
      isSaved: true,
      teamData: [
        {
          teamName: "TEAM X",
          playerKills: {
            "SniperPro": 0, // Total = 8 + 0 = 8, Peak = 8
            "SteadyGun": 4  // Total = 4 + 4 = 8, Peak = 4
          }
        }
      ]
    }
  ];

  const res = calculateTournamentMVPFromMatches(matches);
  assert.strictEqual(res.topFragger.playerName, "SniperPro", "Player with higher single-match peak (8 vs 4) wins tie");
  console.log("✓ MVP Tie-breaker priority (Highest single match peak kills) verified.");
}

// =========================================================================
// TEST 4: Auto-Sum Squad Player Kills into Team Total Kills
// =========================================================================
{
  const roster = ["PlayerA", "PlayerB", "PlayerC", "PlayerD"];
  const playerKills = {
    "PlayerA": 3,
    "PlayerB": 4,
    "PlayerC": 0,
    "PlayerD": 2
  };

  const autoSum = roster.reduce((sum, p) => sum + (playerKills[p] || 0), 0);
  assert.strictEqual(autoSum, 9, "Auto-sum of player kills must equal 3 + 4 + 0 + 2 = 9");
  console.log("✓ Auto-sum squad player kills to total team kills verified.");
}

// =========================================================================
// TEST 5: Graceful Handling of Untracked / Missing Players
// =========================================================================
{
  const matches = [
    {
      matchNumber: 1,
      isSaved: true,
      teamData: [
        {
          teamName: "SOLO SQUAD",
          kills: 5,
          playerKills: {} // No individual roster kills recorded
        },
        {
          teamName: "DUO SQUAD",
          kills: 4,
          playerKills: { "StarShooter": 4 }
        }
      ]
    }
  ];

  const res = calculateTournamentMVPFromMatches(matches);
  assert.strictEqual(res.topFragger.playerName, "StarShooter");
  assert.strictEqual(res.topFragger.totalKills, 4);
  console.log("✓ Gracefully ignores teams without roster breakdowns without failing.");
}

console.log("\n=======================================================");
console.log("🎉 ALL MVP (MOST VALUABLE PLAYER) TRACKER TESTS PASSED 100%!");
console.log("=======================================================");
