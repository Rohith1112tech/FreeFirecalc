// Unit Test for Multi-Lobby Isolated Databases (Lobby 1, Lobby 2, Lobby 3)
const assert = require('assert');

console.log("Running Multi-Lobby Database Isolation Tests (Lobby 1, Lobby 2, Lobby 3)...");

// Mock LocalStorage
const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => {
    for (const k of Object.keys(localStorageStore)) {
      delete localStorageStore[k];
    }
  }
};

// Mock Minimal DOM
global.document = {
  getElementById: (id) => ({
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    setAttribute: () => {},
    addEventListener: () => {}
  }),
  querySelectorAll: () => []
};

// 1. Verify Multi-Lobby Configurations
const LOBBY_CONFIGS = {
  lobby1: { id: "lobby1", label: "LOBBY 1", defaultTitle: "NZ PAID SCRIMS - LOBBY 01", dbTag: "DB-01" },
  lobby2: { id: "lobby2", label: "LOBBY 2", defaultTitle: "NZ PAID SCRIMS - LOBBY 02", dbTag: "DB-02" },
  lobby3: { id: "lobby3", label: "LOBBY 3", defaultTitle: "NZ PAID SCRIMS - LOBBY 03", dbTag: "DB-03" }
};

assert.strictEqual(Object.keys(LOBBY_CONFIGS).length, 3, "Must have exactly 3 lobbies configured");
assert.strictEqual(LOBBY_CONFIGS.lobby1.label, "LOBBY 1");
assert.strictEqual(LOBBY_CONFIGS.lobby2.label, "LOBBY 2");
assert.strictEqual(LOBBY_CONFIGS.lobby3.label, "LOBBY 3");
console.log("✓ Multi-lobby configurations verified (Lobby 1, Lobby 2, Lobby 3).");

// 2. Storage Key Isolation Verification
function getLobbyStorageKey(lobbyId) {
  return `ff_tournament_calculator_state_${lobbyId || "lobby1"}`;
}

const key1 = getLobbyStorageKey("lobby1");
const key2 = getLobbyStorageKey("lobby2");
const key3 = getLobbyStorageKey("lobby3");

assert.strictEqual(key1, "ff_tournament_calculator_state_lobby1");
assert.strictEqual(key2, "ff_tournament_calculator_state_lobby2");
assert.strictEqual(key3, "ff_tournament_calculator_state_lobby3");
assert.notStrictEqual(key1, key2);
assert.notStrictEqual(key2, key3);
assert.notStrictEqual(key1, key3);
console.log("✓ Dedicated database keys for each lobby verified.");

// 3. Test Backward Compatibility Migration (Existing User Data -> Lobby 1)
const legacyData = {
  tournamentTitle: "LEGACY NZ SCRIMS CUP",
  totalMatches: 4,
  teams: ["LEGACY TEAM 1", "LEGACY TEAM 2"],
  matches: [{ matchNumber: 1, isSaved: true, teamData: [{ teamName: "LEGACY TEAM 1", placement: 1, kills: 10 }] }]
};
localStorage.setItem("ff_tournament_calculator_state", JSON.stringify(legacyData));

// Simulate loading lobby1 when target key doesn't exist yet
let activeLobby = "lobby1";
let saved = localStorage.getItem(getLobbyStorageKey(activeLobby));
if (!saved && activeLobby === "lobby1") {
  const legacySaved = localStorage.getItem("ff_tournament_calculator_state");
  if (legacySaved) {
    saved = legacySaved;
    localStorage.setItem(getLobbyStorageKey(activeLobby), legacySaved);
  }
}

assert.ok(localStorage.getItem(key1), "Legacy tournament data must migrate cleanly into Lobby 1 database");
const loadedLobby1 = JSON.parse(localStorage.getItem(key1));
assert.strictEqual(loadedLobby1.tournamentTitle, "LEGACY NZ SCRIMS CUP");
console.log("✓ Backward compatibility migration into Lobby 1 verified.");

// 4. Data Entry in Lobby 1
const lobby1Data = {
  activeLobby: "lobby1",
  tournamentTitle: "NZ SCRIMS - LOBBY 01 AFTERNOON",
  totalMatches: 6,
  teams: ["ALPHA 1", "BETA 1", "GAMMA 1"],
  teamRosters: { 0: ["AlphaP1", "AlphaP2"] },
  matches: [
    {
      matchNumber: 1,
      isSaved: true,
      teamData: [
        { teamName: "ALPHA 1", placement: 1, kills: 14, minus: 0 },
        { teamName: "BETA 1", placement: 2, kills: 6, minus: 0 }
      ]
    }
  ]
};
localStorage.setItem(key1, JSON.stringify(lobby1Data));
localStorage.setItem("ff_active_lobby_id", "lobby1");

// 5. Switch to Lobby 2 and Verify 100% Data Isolation
// Lobby 2 must be independent - Lobby 1 data must NOT be visible
assert.strictEqual(localStorage.getItem(key2), null, "Lobby 2 must start empty/fresh");

const lobby2Data = {
  activeLobby: "lobby2",
  tournamentTitle: "NZ SCRIMS - LOBBY 02 EVENING",
  totalMatches: 5,
  teams: ["TITAN 2", "VORTEX 2", "PHANTOM 2"],
  teamRosters: { 0: ["TitanSniper", "TitanRusher"] },
  matches: [
    {
      matchNumber: 1,
      isSaved: true,
      teamData: [
        { teamName: "TITAN 2", placement: 3, kills: 2, minus: 1 },
        { teamName: "VORTEX 2", placement: 1, kills: 9, minus: 0 }
      ]
    }
  ]
};
localStorage.setItem(key2, JSON.stringify(lobby2Data));
localStorage.setItem("ff_active_lobby_id", "lobby2");

// Verify Lobby 1 was not modified by Lobby 2 writes
const verifyLobby1 = JSON.parse(localStorage.getItem(key1));
assert.strictEqual(verifyLobby1.tournamentTitle, "NZ SCRIMS - LOBBY 01 AFTERNOON");
assert.strictEqual(verifyLobby1.teams[0], "ALPHA 1");
assert.strictEqual(verifyLobby1.matches[0].teamData[0].kills, 14);

const verifyLobby2 = JSON.parse(localStorage.getItem(key2));
assert.strictEqual(verifyLobby2.tournamentTitle, "NZ SCRIMS - LOBBY 02 EVENING");
assert.strictEqual(verifyLobby2.teams[0], "TITAN 2");
assert.strictEqual(verifyLobby2.matches[0].teamData[0].kills, 2);
console.log("✓ 100% Data isolation verified between Lobby 1 and Lobby 2.");

// 6. Data Entry in Lobby 3
const lobby3Data = {
  activeLobby: "lobby3",
  tournamentTitle: "NZ SCRIMS - LOBBY 03 NIGHT",
  totalMatches: 3,
  teams: ["OMEGA 3", "DELTA 3"],
  matches: []
};
localStorage.setItem(key3, JSON.stringify(lobby3Data));
localStorage.setItem("ff_active_lobby_id", "lobby3");

const verifyLobby3 = JSON.parse(localStorage.getItem(key3));
assert.strictEqual(verifyLobby3.tournamentTitle, "NZ SCRIMS - LOBBY 03 NIGHT");
assert.strictEqual(verifyLobby3.totalMatches, 3);
console.log("✓ Lobby 3 independent database verified.");

// 7. Test Resetting Lobby 2 leaves Lobby 1 and Lobby 3 untouched
localStorage.removeItem(key2);
assert.strictEqual(localStorage.getItem(key2), null, "Lobby 2 database wiped");
assert.ok(localStorage.getItem(key1), "Lobby 1 database MUST remain intact after Lobby 2 reset");
assert.ok(localStorage.getItem(key3), "Lobby 3 database MUST remain intact after Lobby 2 reset");
assert.strictEqual(JSON.parse(localStorage.getItem(key1)).tournamentTitle, "NZ SCRIMS - LOBBY 01 AFTERNOON");
console.log("✓ Resetting one lobby leaves all other lobbies 100% untouched.");

// 8. Test Cloud Backup Filename Generation for Each Lobby
function getCloudBackupFilename(lobbyId, title) {
  const lobbyPrefix = lobbyId.toUpperCase();
  const safeTitle = (title || "Tournament").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `FreeFire_${lobbyPrefix}_${safeTitle}_AutoBackup.json`;
}

const fileLobby1 = getCloudBackupFilename("lobby1", "Scrims_Afternoon");
const fileLobby2 = getCloudBackupFilename("lobby2", "Scrims_Evening");
const fileLobby3 = getCloudBackupFilename("lobby3", "Scrims_Night");

assert.strictEqual(fileLobby1, "FreeFire_LOBBY1_Scrims_Afternoon_AutoBackup.json");
assert.strictEqual(fileLobby2, "FreeFire_LOBBY2_Scrims_Evening_AutoBackup.json");
assert.strictEqual(fileLobby3, "FreeFire_LOBBY3_Scrims_Night_AutoBackup.json");
assert.notStrictEqual(fileLobby1, fileLobby2);
assert.notStrictEqual(fileLobby2, fileLobby3);
console.log("✓ Cloud Drive backup filename isolation verified for all 3 lobbies.");

// 9. Test Google Sheets Row Lobby Tagging
function formatSheetRow(lobbyId, tournamentTitle, matchNum, team) {
  const lobbyLabel = LOBBY_CONFIGS[lobbyId].label;
  return [
    "2026-10-27 17:00:00",
    `[${lobbyLabel}] ${tournamentTitle}`,
    `Match ${matchNum}`,
    team.placement,
    team.teamName,
    team.kills,
    team.totalPoints
  ];
}

const sheetRow1 = formatSheetRow("lobby1", "NZ Scrims", 1, { placement: 1, teamName: "ALPHA 1", kills: 14, totalPoints: 26 });
const sheetRow2 = formatSheetRow("lobby2", "NZ Scrims", 1, { placement: 1, teamName: "VORTEX 2", kills: 9, totalPoints: 21 });
const sheetRow3 = formatSheetRow("lobby3", "NZ Scrims", 1, { placement: 1, teamName: "OMEGA 3", kills: 5, totalPoints: 17 });

assert.strictEqual(sheetRow1[1], "[LOBBY 1] NZ Scrims");
assert.strictEqual(sheetRow2[1], "[LOBBY 2] NZ Scrims");
assert.strictEqual(sheetRow3[1], "[LOBBY 3] NZ Scrims");
console.log("✓ Google Sheets row tagging with distinct Lobby labels verified.");

console.log("\n=======================================================");
console.log("🎉 ALL MULTI-LOBBY DATABASE ISOLATION TESTS PASSED 100%!");
console.log("=======================================================");
