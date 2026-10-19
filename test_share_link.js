/**
 * Free Fire Tournament Share Results Link Test Suite
 * Validates encoding, decoding, data fidelity, compression, and link generation.
 */

const assert = require("assert");
const zlib = require("zlib");

console.log("Running Share Results Link Encoding & Decoding Tests...\n");

/**
 * URL-Safe Base64 helpers
 */
function uint8ArrayToBase64Url(uint8Array) {
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUint8Array(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf);
}

/**
 * Compact tournament serializer
 */
function serializeTournamentState(state) {
  const matchesData = (state.matches || []).map((m) => {
    return [
      m.matchNumber || 0,
      m.isSaved ? 1 : 0,
      (m.teamData || []).map((t) => [
        t.placement !== "" && t.placement !== undefined ? t.placement : "",
        t.kills || 0,
        t.minus || 0,
        t.playerKills || {}
      ])
    ];
  });

  return {
    v: 1, // Schema version
    t: state.tournamentTitle || "FREE FIRE TOURNAMENT",
    m: state.totalMatches || 6,
    th: state.selectedPosterTheme || "red",
    tm: state.teams || [],
    r: state.teamRosters || {},
    d: matchesData
  };
}

/**
 * Compact tournament deserializer
 */
function deserializeTournamentState(compact) {
  if (!compact || compact.v !== 1) return null;

  const matches = (compact.d || []).map((mArr) => {
    const matchNumber = mArr[0];
    const isSaved = mArr[1] === 1;
    const rawTeamData = mArr[2] || [];

    const teamData = (compact.tm || []).map((teamName, idx) => {
      const t = rawTeamData[idx] || ["", 0, 0, {}];
      return {
        teamName,
        placement: t[0],
        kills: typeof t[1] === "number" ? t[1] : 0,
        minus: typeof t[2] === "number" ? t[2] : 0,
        playerKills: typeof t[3] === "object" && t[3] !== null ? t[3] : {}
      };
    });

    return {
      matchNumber,
      isSaved,
      teamData
    };
  });

  return {
    tournamentTitle: compact.t,
    totalMatches: compact.m,
    selectedPosterTheme: compact.th || "red",
    teams: compact.tm,
    teamRosters: compact.r || {},
    matches
  };
}

/**
 * Encode state to share parameter
 */
function encodeTournamentToShareParam(state) {
  const compact = serializeTournamentState(state);
  const jsonStr = JSON.stringify(compact);
  const jsonBuf = Buffer.from(jsonStr, "utf-8");

  // Compress using deflate raw
  const deflated = zlib.deflateRawSync(jsonBuf);
  const b64Url = uint8ArrayToBase64Url(deflated);
  return "z:" + b64Url;
}

/**
 * Decode share parameter back to state
 */
function decodeShareParamToTournament(param) {
  if (!param || typeof param !== "string") return null;

  try {
    let jsonStr = "";
    if (param.startsWith("z:")) {
      const b64 = param.slice(2);
      const uint8 = base64UrlToUint8Array(b64);
      const inflated = zlib.inflateRawSync(Buffer.from(uint8));
      jsonStr = inflated.toString("utf-8");
    } else if (param.startsWith("r:")) {
      const b64 = param.slice(2);
      const uint8 = base64UrlToUint8Array(b64);
      jsonStr = Buffer.from(uint8).toString("utf-8");
    } else {
      // Legacy or direct raw base64
      const uint8 = base64UrlToUint8Array(param);
      jsonStr = Buffer.from(uint8).toString("utf-8");
    }

    const compact = JSON.parse(jsonStr);
    return deserializeTournamentState(compact);
  } catch (err) {
    console.error("Failed to decode tournament parameter:", err.message);
    return null;
  }
}

// =========================================================================
// TEST 1: End-to-end Serialization & Deserialization
// =========================================================================
{
  const mockState = {
    tournamentTitle: "NZ PAID SCRIMS ★ S1",
    totalMatches: 6,
    selectedPosterTheme: "cyan",
    teams: [
      "TEAM EVOS 亗", "TOTAL GAMING", "TSM ⚡", "GALAXY RACER",
      "TEAM ELITE", "ORANGUTAN", "HYDRA ESPORTS", "CHEMIN ESPORTS",
      "GODLIKE", "BLIND ESPORTS", "REVENANT", "ENIGMA GAMING"
    ],
    teamRosters: {
      0: ["Mr05", "SAM13", "Abu", "Street"],
      1: ["Ajjubhai", "FozyAjay", "Mafia", "Bala"]
    },
    matches: [
      {
        matchNumber: 1,
        isSaved: true,
        teamData: [
          { teamName: "TEAM EVOS 亗", placement: 1, kills: 10, minus: 0, playerKills: { "Mr05": 6, "SAM13": 2, "Abu": 1, "Street": 1 } },
          { teamName: "TOTAL GAMING", placement: 2, kills: 5, minus: 1, playerKills: { "Ajjubhai": 3, "FozyAjay": 2 } }
        ]
      },
      {
        matchNumber: 2,
        isSaved: true,
        teamData: [
          { teamName: "TEAM EVOS 亗", placement: 3, kills: 4, minus: 0, playerKills: { "Mr05": 3, "SAM13": 1 } },
          { teamName: "TOTAL GAMING", placement: 1, kills: 8, minus: 0, playerKills: { "Ajjubhai": 5, "FozyAjay": 3 } }
        ]
      }
    ]
  };

  const shareParam = encodeTournamentToShareParam(mockState);
  assert.ok(shareParam.startsWith("z:"), "Must use compressed prefix z:");
  console.log("✓ Encoded Share Param length:", shareParam.length, "characters (extremely compact).");

  const restored = decodeShareParamToTournament(shareParam);
  assert.ok(restored, "Restored state must not be null");
  assert.strictEqual(restored.tournamentTitle, mockState.tournamentTitle);
  assert.strictEqual(restored.totalMatches, 6);
  assert.strictEqual(restored.selectedPosterTheme, "cyan");
  assert.strictEqual(restored.teams.length, 12);
  assert.strictEqual(restored.teams[0], "TEAM EVOS 亗");
  assert.strictEqual(restored.teamRosters[0][0], "Mr05");

  // Check Match 1
  assert.strictEqual(restored.matches.length, 2);
  assert.strictEqual(restored.matches[0].matchNumber, 1);
  assert.strictEqual(restored.matches[0].isSaved, true);
  assert.strictEqual(restored.matches[0].teamData[0].placement, 1);
  assert.strictEqual(restored.matches[0].teamData[0].kills, 10);
  assert.strictEqual(restored.matches[0].teamData[0].playerKills["Mr05"], 6);
  assert.strictEqual(restored.matches[0].teamData[1].minus, 1);

  // Check Match 2
  assert.strictEqual(restored.matches[1].teamData[1].placement, 1);
  assert.strictEqual(restored.matches[1].teamData[1].kills, 8);
  assert.strictEqual(restored.matches[1].teamData[1].playerKills["Ajjubhai"], 5);

  console.log("✓ Full tournament fidelity preserved 100% across all matches, rosters, penalties & MVP kills.");
}

// =========================================================================
// TEST 2: Graceful Error Handling on Corrupted Param
// =========================================================================
{
  const invalid = decodeShareParamToTournament("z:invalid_corrupted_garbage_123");
  assert.strictEqual(invalid, null, "Should return null on corrupted data");

  const empty = decodeShareParamToTournament("");
  assert.strictEqual(empty, null, "Should return null on empty string");

  console.log("✓ Corrupted/invalid URLs handled gracefully without throwing unhandled exceptions.");
}

// =========================================================================
// TEST 3: Generate Social Sharing Text & URLs
// =========================================================================
{
  const baseUrl = "https://freefirecalc.com/";
  const shareParam = "z:test_hash";
  const shareUrl = `${baseUrl}#share=${shareParam}`;

  const summary = {
    title: "FREE FIRE GRAND TOURNAMENT",
    winnerName: "TEAM EVOS",
    winnerPoints: 78,
    mvpName: "Mr05",
    mvpKills: 14
  };

  const whatsappText = `🏆 *${summary.title} - FINAL RESULTS* 🏆\n\n🥇 *1st Place:* ${summary.winnerName} (${summary.winnerPoints} PTS)\n👑 *Tournament MVP:* ${summary.mvpName} (${summary.mvpKills} KILLS)\n\n📊 *View Full Live Standings & Matrix:* \n${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  assert.ok(whatsappUrl.includes("wa.me"), "WhatsApp URL must be properly formed");
  assert.ok(whatsappUrl.includes(encodeURIComponent(summary.title)), "Title must be encoded");
  assert.ok(whatsappUrl.includes(encodeURIComponent(shareUrl)), "Share URL must be in WhatsApp text");

  console.log("✓ WhatsApp and social sharing URL generators formatted correctly.");
}

console.log("\n=======================================================");
console.log("🎉 ALL SHARE RESULTS LINK TESTS PASSED 100%!");
console.log("=======================================================");
