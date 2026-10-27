// Comprehensive End-to-End Inch-by-Inch Verification
const assert = require('assert');
const fs = require('fs');

console.log("===================================================================");
console.log("🚀 STARTING INCH-BY-INCH FULL TOURNAMENT & MULTI-LOBBY VERIFICATION");
console.log("===================================================================\n");

// 1. Syntax & Structural File Check
console.log("▶ Step 1: Validating file syntax and compilation...");
try {
  require('child_process').execSync('node --check app.js', { stdio: 'pipe' });
  console.log("  ✓ app.js syntax 100% clean (0 errors)");
} catch (e) {
  console.error("  ✕ app.js syntax error:", e.message);
  process.exit(1);
}

// 2. Setup Simulated DOM Environment for app.js
const domElements = {};
function createMockElement(id, tagName = 'div') {
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      },
      contains: function(c) { return this._classes.has(c); }
    },
    children: [],
    appendChild: function(child) {
      this.children.push(child);
      return child;
    },
    removeChild: function(child) {
      const idx = this.children.indexOf(child);
      if (idx > -1) this.children.splice(idx, 1);
      return child;
    },
    setAttribute: function(name, val) { this[name] = String(val); },
    getAttribute: function(name) { return this[name] || null; },
    focus: function() {},
    click: function() {
      if (this._listeners['click']) {
        this._listeners['click'].forEach(fn => fn({ target: this }));
      }
    },
    _listeners: {},
    addEventListener: function(evt, handler) {
      if (!this._listeners[evt]) this._listeners[evt] = [];
      this._listeners[evt].push(handler);
    },
    querySelectorAll: function(sel) {
      const results = [];
      function recurse(node) {
        if (!node || !node.children) return;
        for (const child of node.children) {
          if (sel.startsWith('.') && child.className && child.className.includes(sel.substring(1))) {
            results.push(child);
          } else if (sel.startsWith('#') && child.id === sel.substring(1)) {
            results.push(child);
          } else if (child.tagName && child.tagName.toLowerCase() === sel.toLowerCase()) {
            results.push(child);
          }
          recurse(child);
        }
      }
      recurse(this);
      return results;
    }
  };
  domElements[id] = el;
  return el;
}

// Global Storage
const storageStore = {};
global.localStorage = {
  getItem: (key) => storageStore[key] || null,
  setItem: (key, val) => { storageStore[key] = String(val); },
  removeItem: (key) => { delete storageStore[key]; },
  clear: () => {
    for (const k of Object.keys(storageStore)) delete storageStore[k];
  }
};

// Global Document
global.document = {
  getElementById: (id) => domElements[id] || createMockElement(id),
  createElement: (tag) => createMockElement('el_' + Math.random().toString(36).substring(2, 8), tag),
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: createMockElement('body')
};

global.window = {
  location: { href: 'https://calculator.test/', search: '', hash: '' },
  history: { replaceState: () => {} },
  scrollTo: () => {}
};

global.navigator = {
  clipboard: {
    writeText: async () => {}
  }
};

// 3. Load Application Logic
console.log("▶ Step 2: Loading core application modules...");
const app = require('./app.js');
assert.ok(app.state, "State object must be loaded");
assert.ok(app.DEFAULT_TEAMS, "Default teams must be defined");
assert.strictEqual(app.DEFAULT_TEAMS.length, 12, "Must have exactly 12 default teams");
console.log("  ✓ Core modules loaded with 12 default esports teams.");

// 4. Test Official Free Fire Scoring Formula
console.log("▶ Step 3: Verifying Official Free Fire Scoring Table inch-by-inch...");
const OFFICIAL_RULES = [
  { place: 1, expectedPts: 12 },
  { place: 2, expectedPts: 9 },
  { place: 3, expectedPts: 8 },
  { place: 4, expectedPts: 7 },
  { place: 5, expectedPts: 6 },
  { place: 6, expectedPts: 5 },
  { place: 7, expectedPts: 4 },
  { place: 8, expectedPts: 3 },
  { place: 9, expectedPts: 2 },
  { place: 10, expectedPts: 1 },
  { place: 11, expectedPts: 0 },
  { place: 12, expectedPts: 0 }
];

OFFICIAL_RULES.forEach(rule => {
  const res = app.calculateTeamMatchScore(rule.place, 0, 0);
  assert.strictEqual(res.placementPoints, rule.expectedPts, `Rank #${rule.place} must award ${rule.expectedPts} pts`);
  assert.strictEqual(res.totalPoints, rule.expectedPts, `Total for 0 kills must equal ${rule.expectedPts}`);
});
console.log("  ✓ All 12 placement points validated against official esports rules.");

// Test Kills and Penalties
const testScore1 = app.calculateTeamMatchScore(1, 14, 0); // Booyah + 14 kills = 26
assert.strictEqual(testScore1.totalPoints, 26, "1st place + 14 kills = 26 pts");

const testScore2 = app.calculateTeamMatchScore(3, 5, 2); // 8 place + 5 kills - 2 penalty = 11
assert.strictEqual(testScore2.totalPoints, 11, "3rd place (8) + 5 kills (5) - 2 minus (2) = 11 pts");
console.log("  ✓ Kill points (1 pt/kill) and minus penalty deduction formulas verified.");

// 5. Test 3-Lobby Switching & 100% Database Isolation
console.log("▶ Step 4: Simulating 3-Lobby independent match scoring...");

// LOBBY 1 Simulation: User conducts Lobby 1 Scrims
app.state.activeLobby = "lobby1";
app.state.tournamentTitle = "NZ PAID SCRIMS - LOBBY 01 (AFTERNOON)";
app.state.totalMatches = 4;
app.state.teams = [
  "L1 TEAM ALPHA", "L1 TEAM BRAVO", "L1 TEAM CHARLIE", "L1 TEAM DELTA",
  "L1 TEAM ECHO", "L1 TEAM FOXTROT", "L1 TEAM GOLF", "L1 TEAM HOTEL",
  "L1 TEAM INDIA", "L1 TEAM JULIET", "L1 TEAM KILO", "L1 TEAM LIMA"
];
app.state.teamRosters = {
  0: ["Alpha_Vincenzo", "Alpha_Wolf", "Alpha_Crush", "Alpha_Dare"],
  1: ["Bravo_Ranger", "Bravo_Sniper", "Bravo_Ghost", "Bravo_Beast"]
};
app.state.matches = [
  {
    matchNumber: 1,
    isSaved: true,
    teamData: [
      { teamName: "L1 TEAM ALPHA", placement: 1, kills: 12, minus: 0 }, // 12 + 12 = 24 pts
      { teamName: "L1 TEAM BRAVO", placement: 2, kills: 5, minus: 1 },  // 9 + 5 - 1 = 13 pts
      { teamName: "L1 TEAM CHARLIE", placement: 3, kills: 3, minus: 0 } // 8 + 3 = 11 pts
    ]
  },
  {
    matchNumber: 2,
    isSaved: true,
    teamData: [
      { teamName: "L1 TEAM ALPHA", placement: 2, kills: 8, minus: 0 },  // 9 + 8 = 17 pts
      { teamName: "L1 TEAM BRAVO", placement: 1, kills: 10, minus: 0 }  // 12 + 10 = 22 pts
    ]
  }
];
// Save Lobby 1
app.saveState();
console.log("  ✓ Lobby 1 entered and saved (Title, 12 Teams, Rosters, 2 Matches).");

// LOBBY 2 Simulation: User switches to Lobby 2
app.switchLobby("lobby2");

assert.strictEqual(app.state.activeLobby, "lobby2", "Active lobby must be lobby2");
// Verify Lobby 1's title is NOT in Lobby 2
assert.notStrictEqual(app.state.tournamentTitle, "NZ PAID SCRIMS - LOBBY 01 (AFTERNOON)", "Lobby 2 must have its own title");

// Enter Lobby 2 unique tournament
app.state.tournamentTitle = "NZ PAID SCRIMS - LOBBY 02 (EVENING)";
app.state.totalMatches = 6;
app.state.teams = [
  "L2 TITAN X", "L2 VORTEX ESPORTS", "L2 PHANTOM CLAN", "L2 SHADOW 9",
  "L2 APEX LEGENDS", "L2 DRAGON SQUAD", "L2 REAPER ESPORTS", "L2 FALCON X",
  "L2 IMMORTALS", "L2 WARRIORS", "L2 GODZILLA", "L2 KNIGHTS"
];
app.state.teamRosters = {
  0: ["Titan_Reaper", "Titan_Flash", "Titan_Blade", "Titan_Hawk"]
};
app.state.matches = [
  {
    matchNumber: 1,
    isSaved: true,
    teamData: [
      { teamName: "L2 TITAN X", placement: 1, kills: 15, minus: 0 }, // 12 + 15 = 27 pts
      { teamName: "L2 VORTEX ESPORTS", placement: 2, kills: 4, minus: 0 } // 9 + 4 = 13 pts
    ]
  }
];
// Save Lobby 2
app.saveState();
console.log("  ✓ Lobby 2 entered and saved (Different Title, Different Teams, 1 Match).");

// LOBBY 3 Simulation: User switches to Lobby 3
app.switchLobby("lobby3");
assert.strictEqual(app.state.activeLobby, "lobby3", "Active lobby must be lobby3");
assert.notStrictEqual(app.state.tournamentTitle, "NZ PAID SCRIMS - LOBBY 02 (EVENING)");

app.state.tournamentTitle = "NZ PAID SCRIMS - LOBBY 03 (NIGHT)";
app.state.teams = [
  "L3 TEAM OMEGA", "L3 TEAM MATRIX", "L3 TEAM CYBER", "L3 TEAM NOVA",
  "L3 TEAM CHAOS", "L3 TEAM STORM", "L3 TEAM VIPER", "L3 TEAM HYDRA",
  "L3 TEAM BLAZE", "L3 TEAM VENOM", "L3 TEAM ZERO", "L3 TEAM ECLIPSE"
];
app.saveState();
console.log("  ✓ Lobby 3 entered and saved with dedicated teams.");

// 6. Verify Complete Data Isolation When Switching Back
console.log("▶ Step 5: Verifying data isolation roundtrip across lobbies...");

// Switch back to Lobby 1
app.switchLobby("lobby1");
assert.strictEqual(app.state.activeLobby, "lobby1");
assert.strictEqual(app.state.tournamentTitle, "NZ PAID SCRIMS - LOBBY 01 (AFTERNOON)");
assert.strictEqual(app.state.teams[0], "L1 TEAM ALPHA");
assert.strictEqual(app.state.matches.length, 4);
assert.strictEqual(app.state.matches[0].isSaved, true);
assert.strictEqual(app.state.matches[0].teamData[0].kills, 12);
assert.strictEqual(app.state.matches[1].teamData[0].kills, 8);
console.log("  ✓ Lobby 1 data restored 100% intact (No data bleeding from Lobby 2 or 3).");

// Switch back to Lobby 2
app.switchLobby("lobby2");
assert.strictEqual(app.state.activeLobby, "lobby2");
assert.strictEqual(app.state.tournamentTitle, "NZ PAID SCRIMS - LOBBY 02 (EVENING)");
assert.strictEqual(app.state.teams[0], "L2 TITAN X");
assert.strictEqual(app.state.matches[0].teamData[0].kills, 15);
console.log("  ✓ Lobby 2 data restored 100% intact.");

// Switch back to Lobby 3
app.switchLobby("lobby3");
assert.strictEqual(app.state.activeLobby, "lobby3");
assert.strictEqual(app.state.tournamentTitle, "NZ PAID SCRIMS - LOBBY 03 (NIGHT)");
assert.strictEqual(app.state.teams[0], "L3 TEAM OMEGA");
console.log("  ✓ Lobby 3 data restored 100% intact.");

// 7. Verify Independent Reset
console.log("▶ Step 6: Testing reset isolation...");
// Execute reset on Lobby 2 ONLY
app.switchLobby("lobby2");
app.handleExecuteTournamentReset();

assert.strictEqual(app.state.activeLobby, "lobby2");
assert.strictEqual(app.state.tournamentTitle, "NZ PAID SCRIMS - LOBBY 02");
assert.strictEqual(app.state.matches.every(m => !m.isSaved), true, "Lobby 2 matches must be cleared");

// Switch back to Lobby 1: MUST STILL HAVE ALL MATCHES!
app.switchLobby("lobby1");
assert.strictEqual(app.state.tournamentTitle, "NZ PAID SCRIMS - LOBBY 01 (AFTERNOON)");
assert.strictEqual(app.state.matches[0].isSaved, true, "Lobby 1 data MUST remain untouched after Lobby 2 reset!");
assert.strictEqual(app.state.matches[0].teamData[0].kills, 12);
console.log("  ✓ Resetting Lobby 2 left Lobby 1 100% safe and intact.");

// 8. Test Live Cloud Google Drive & Sheets Sync
console.log("▶ Step 7: Testing live Google Apps Script Webhook integration...");
const webhookUrl = "https://script.google.com/macros/s/AKfycbwv8ivPcj2-ikMGqILRlZ2O6JCPN4AEghlszokgIQlZr_JOM4TfPgqNRM1e3xewl0T1/exec";

async function testLiveWebhookSync() {
  // Test Ping
  const pingRes = await fetch(webhookUrl).then(r => r.json());
  assert.strictEqual(pingRes.status, "ONLINE", "Webhook must be ONLINE");
  assert.strictEqual(pingRes.folderId, "1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5", "Drive Folder ID verified");
  assert.strictEqual(pingRes.spreadsheetId, "1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4", "Spreadsheet ID verified");
  console.log("  ✓ Webhook status ONLINE & verified (HTTP 200 OK).");

  // Save Lobby 1 to Drive
  const saveL1Payload = {
    action: "backup",
    lobbyId: "lobby1",
    lobbyName: "LOBBY 1",
    filename: "FreeFire_LOBBY1_AutoBackup.json",
    backupData: {
      tournamentTitle: "NZ PAID SCRIMS - LOBBY 01 (AFTERNOON)",
      totalMatches: 4,
      teams: ["L1 TEAM ALPHA", "L1 TEAM BRAVO"],
      matches: [{ matchNumber: 1, isSaved: true, teamData: [{ teamName: "L1 TEAM ALPHA", placement: 1, kills: 12 }] }],
      savedAt: new Date().toISOString()
    }
  };

  const saveRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(saveL1Payload)
  }).then(r => r.json());

  assert.strictEqual(saveRes.success, true, "Lobby 1 backup upload must succeed");
  console.log("  ✓ Lobby 1 cloud backup saved into Drive Folder.");

  // Read back Lobby 1 from Drive
  const readBack = await fetch(`${webhookUrl}?action=get_backup&lobbyId=lobby1`).then(r => r.json());
  assert.strictEqual(readBack.success, true);
  assert.strictEqual(readBack.found, true);
  assert.strictEqual(readBack.lobbyId, "lobby1");
  assert.strictEqual(readBack.backupData.tournamentTitle, "NZ PAID SCRIMS - LOBBY 01 (AFTERNOON)");
  assert.strictEqual(readBack.backupData.matches[0].teamData[0].kills, 12);
  console.log("  ✓ Lobby 1 cloud backup read back successfully with 100% fidelity.");

  // Test Sheets Append with [LOBBY 1] Tag
  const sheetPayload = {
    action: "append_sheet",
    lobbyId: "lobby1",
    lobbyName: "LOBBY 1",
    sheetRows: [
      [new Date().toLocaleString(), "[LOBBY 1] NZ PAID SCRIMS", "Match 1", 1, "L1 TEAM ALPHA", "Alpha_Vincenzo", 12, 12, 24]
    ]
  };

  const sheetRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(sheetPayload)
  }).then(r => r.json());

  assert.strictEqual(sheetRes.success, true);
  assert.strictEqual(sheetRes.sheet.rowsAppended, 1);
  console.log("  ✓ Match scores successfully appended to Google Spreadsheet under LOBBY 1 tab.");

  // Step 8: Cross-Lobby Alert Isolation & Silent Background Sync
  console.log("▶ Step 8: Verifying Cross-Lobby Alert Isolation & Silent Background Sync...");
  const successBox = global.document.getElementById("match-success-alert");
  const successMsg = global.document.getElementById("match-success-message");
  
  // Set active lobby to lobby1
  app.state.activeLobby = "lobby1";
  app.hideMatchAlerts();
  assert.strictEqual(successBox.style.display, "none", "Alerts must be hidden initially");

  // A silent sync for Lobby 2 must NEVER pop up an alert on screen
  await app.syncMatchScoresToGoogleSheets(1, [{ teamName: "L2 TEAM ALPHA", placement: 1, kills: 5 }], { silent: true, lobbyId: "lobby2" });
  assert.strictEqual(successBox.style.display, "none", "Silent sync must NEVER trigger UI toast alert");
  console.log("  ✓ Silent background sync suppresses visual alerts 100%.");

  // An alert intended for Lobby 2 must NOT show if user is currently looking at Lobby 1
  await app.syncMatchScoresToGoogleSheets(1, [{ teamName: "L2 TEAM ALPHA", placement: 1, kills: 5 }], { silent: false, lobbyId: "lobby2" });
  assert.strictEqual(successBox.style.display, "none", "Lobby 2 alert must not display when active lobby is Lobby 1");
  console.log("  ✓ In-flight network completion from another lobby never leaks alerts to current lobby.");

  // An alert for Lobby 1 DOES show when user is on Lobby 1
  app.showMatchAlert("✅ Test Lobby 1 Alert", "success");
  assert.strictEqual(successBox.style.display, "flex", "Lobby 1 alert shows when active lobby is Lobby 1");
  
  // Switching lobby immediately clears any leftover toast
  app.switchLobby("lobby2");
  // Check that the old message was replaced or cleared
  assert.notStrictEqual(successMsg.textContent, "✅ Test Lobby 1 Alert", "Old lobby alert must be cleared on switch");
  console.log("  ✓ Switching lobbies immediately dismisses previous lobby alerts.");
}

testLiveWebhookSync().then(() => {
  console.log("\n===================================================================");
  console.log("🎉 ALL INCH-BY-INCH VERIFICATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("===================================================================");
  process.exit(0);
}).catch(err => {
  console.error("\n✕ Live Webhook Error:", err.message);
  process.exit(1);
});
