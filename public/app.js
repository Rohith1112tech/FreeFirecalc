/**
 * Free Fire Tournament Points Calculator
 * Application State & Logic
 * Comprehensive Scoring Logic (Prompt 3 & Prompt 4)
 */

// Official Free Fire Esports Placement Points Table (Prompt 3 & 4)
const PLACEMENT_POINTS = {
  1: 12, // 1st: 12 pts (Booyah)
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

/**
 * Scoring Helper Functions
 */
function getPlacementPoints(placement) {
  const p = parseInt(placement, 10);
  return PLACEMENT_POINTS[p] !== undefined ? PLACEMENT_POINTS[p] : 0;
}

function getKillPoints(kills) {
  const k = parseInt(kills, 10);
  return isNaN(k) || k < 0 ? 0 : k; // 1 point per kill
}

function getMinusPoints(minus) {
  const m = parseInt(minus, 10);
  return isNaN(m) || m < 0 ? 0 : m; // Penalty deduction points
}

function calculateTeamMatchScore(placement, kills, minus = 0) {
  const placePts = getPlacementPoints(placement);
  const killPts = getKillPoints(kills);
  const minusPts = getMinusPoints(minus);
  return {
    placementPoints: placePts,
    killPoints: killPts,
    minusPoints: minusPts,
    totalPoints: placePts + killPts - minusPts // Total = Placement Points + Kill Points - Minus Points
  };
}

// Sample esports teams for quick autofill
const DEFAULT_TEAMS = [
  "TOTAL GAMING",
  "GODLIKE ESPORTS",
  "TSM FTX",
  "EVOS PHOENIX",
  "ORANGUTAN ELITE",
  "TEAM ELITE",
  "BLIND ESPORTS",
  "GALAXY RACER",
  "ATTACK ALL AROUND",
  "CHEMIN ESPORTS",
  "NIGMA GALAXY",
  "TEAM MAFIA"
];

// App State
const state = {
  tournamentTitle: "NZ PAID SCRIMS - BATTLE 01",
  totalMatches: 6,
  teams: [...DEFAULT_TEAMS],
  teamRosters: {}, // Keyed by team index (0..11): [p1, p2, p3, p4]
  activeScreen: "setup", // 'setup' | 'tournament'
  activeSubView: "view-match-input", // 'view-match-input' | 'view-leaderboard' | 'view-matrix'
  positionDisplayMode: "points", // 'points' (Cumulative Placement Points) | 'average' (Average Placement Rank)
  selectedPosterTheme: "red", // 'red' (Red Crimson) | 'cyan' (Cyan Storm)
  exportFormat: "jpg", // 'jpg' default
  selectedMatchIndex: 0, // 0-indexed (0 = Match 1)
  // Match history & scores
  matches: []
};

// DOM Elements - Setup Screen
const setupScreen = document.getElementById("setup-screen");
const tournamentScreen = document.getElementById("tournament-screen");

const tournamentNameInput = document.getElementById("tournament-name");
const totalMatchesInput = document.getElementById("total-matches");
const matchChips = document.querySelectorAll(".chip-btn");

const teamsInputContainer = document.getElementById("teams-input-container");
const teamsFilledCountEl = document.getElementById("teams-filled-count");
const btnQuickFill = document.getElementById("btn-quick-fill");
const btnClearTeams = document.getElementById("btn-clear-teams");

// Roster Actions & Paste Lineup Modal (Prompt 9: Slot List & Player Lineup)
const btnOpenPasteModal = document.getElementById("btn-open-paste-modal");
const pasteLineupModalBackdrop = document.getElementById("paste-lineup-modal-backdrop");
const btnClosePasteModal = document.getElementById("btn-close-paste-modal");
const btnCancelPasteModal = document.getElementById("btn-cancel-paste-modal");
const btnConfirmImportLineup = document.getElementById("btn-confirm-import-lineup");
const btnLoadSampleLineup = document.getElementById("btn-load-sample-lineup");
const pasteLineupTextarea = document.getElementById("paste-lineup-textarea");
const pastePreviewCount = document.getElementById("paste-preview-count");
const pasteDetectedSummary = document.getElementById("paste-detected-summary");
const btnQuickFillSetup = document.getElementById("btn-quick-fill-setup");
const btnClearAllSetup = document.getElementById("btn-clear-all-setup");
const rosterImportBanner = document.getElementById("roster-import-banner");
const rosterImportMessage = document.getElementById("roster-import-message");

// Separate Area: MESSY SLOT LIST RAW IMPORTER elements
const messySlotTextarea = document.getElementById("messy-slot-textarea");
const btnPasteSampleMessy = document.getElementById("btn-paste-sample-messy");
const btnCleanParseSlots = document.getElementById("btn-clean-parse-slots");

const btnStartTournament = document.getElementById("btn-start-tournament");
const setupErrorMsg = document.getElementById("setup-error-msg");

// DOM Elements - Tournament Dashboard
const activeTournamentTitleEl = document.getElementById("active-tournament-title");
const displayTotalMatchesEl = document.getElementById("display-total-matches");
const btnBackSetup = document.getElementById("btn-back-setup");
const btnResetTournament = document.getElementById("btn-reset-tournament");

// Tournament Nav Tabs
const tabBtnMatches = document.getElementById("tab-btn-matches");
const tabBtnLeaderboard = document.getElementById("tab-btn-leaderboard");
const tabBtnMatrix = document.getElementById("tab-btn-matrix");
const matchProgressBadge = document.getElementById("match-progress-badge");
const viewMatchInput = document.getElementById("view-match-input");
const viewLeaderboard = document.getElementById("view-leaderboard");
const viewMatrix = document.getElementById("view-matrix");

// Match Selector Controls (Prompt 2 & 7)
const matchSelectDropdown = document.getElementById("match-select-dropdown");
const matchTabsContainer = document.getElementById("match-tabs-container");
const activeMatchBanner = document.getElementById("active-match-banner");
const activeMatchTitleText = document.getElementById("active-match-title-text");
const activeMatchStatusPill = document.getElementById("active-match-status-pill");
const matchFlameIcon = document.getElementById("match-flame-icon");

const completedMatchesBar = document.getElementById("completed-matches-bar");
const completedMatchesPills = document.getElementById("completed-matches-pills");
const matchEditBanner = document.getElementById("match-edit-banner");

const btnQuickFillScores = document.getElementById("btn-quick-fill-scores");
const btnResetMatchInputs = document.getElementById("btn-reset-match-inputs");

const matchValidationAlert = document.getElementById("match-validation-alert");
const matchAlertMessage = document.getElementById("match-alert-message");
const matchSuccessAlert = document.getElementById("match-success-alert");
const matchSuccessMessage = document.getElementById("match-success-message");

const matchTeamsGridContainer = document.getElementById("match-teams-grid-container");
const btnSaveMatchData = document.getElementById("btn-save-match-data");
const saveMatchBtnText = document.getElementById("save-match-btn-text");
const saveMatchBtnIcon = document.getElementById("save-match-btn-icon");

// Leaderboard Rows & Controls (Prompt 4 & 5)
const scrimsLeaderboardRowsEl = document.getElementById("scrims-leaderboard-rows");
const btnRefreshLeaderboard = document.getElementById("btn-refresh-leaderboard");
const btnModePoints = document.getElementById("btn-mode-points");
const btnModeAvg = document.getElementById("btn-mode-avg");
const btnDownloadPoster = document.getElementById("btn-download-poster");
const headerPositionLabel = document.getElementById("header-position-label");
const btnThemeRed = document.getElementById("btn-theme-red");
const btnThemeCyan = document.getElementById("btn-theme-cyan");
const btnThemeGreen = document.getElementById("btn-theme-green");
const btnThemeOrange = document.getElementById("btn-theme-orange");
const btnThemePink = document.getElementById("btn-theme-pink");
const btnThemeCyanPurple = document.getElementById("btn-theme-cyan-purple");
const btnThemePurpleBlue = document.getElementById("btn-theme-purple-blue");
const scrimsPosterCapture = document.getElementById("scrims-poster-capture");
const posterTemplateBg = document.getElementById("poster-template-bg");

// Prominent Bottom Export Controls (Prompt 5)
const btnDownloadResultsBottom = document.getElementById("btn-download-results-bottom");
const downloadResultsBtnText = document.getElementById("download-results-btn-text");
const exportStatusMessage = document.getElementById("export-status-message");
const btnFormatPng = document.getElementById("btn-format-png");
const btnFormatJpg = document.getElementById("btn-format-jpg");
const btnCloudBackup = document.getElementById("btn-cloud-backup");
const btnExportToDrive = document.getElementById("btn-export-to-drive");

// Matrix Elements (Prompt 3)
const matrixHeaderRow = document.getElementById("matrix-header-row");
const matrixBodyRows = document.getElementById("matrix-body-rows");

// Modal Elements
const teamModalBackdrop = document.getElementById("team-modal-backdrop");
const modalTeamName = document.getElementById("modal-team-name");
const modalTeamBreakdownContent = document.getElementById("modal-team-breakdown-content");
const btnCloseModal = document.getElementById("btn-close-modal");

// Reset Confirmation Modal Elements (Prompt 6)
const resetModalBackdrop = document.getElementById("reset-modal-backdrop");
const btnCloseResetModal = document.getElementById("btn-close-reset-modal");
const btnCancelReset = document.getElementById("btn-cancel-reset");
const btnConfirmReset = document.getElementById("btn-confirm-reset");
const resetDialogTitle = document.getElementById("reset-dialog-title");
const resetDialogMatches = document.getElementById("reset-dialog-matches");
const resetDialogSavedCount = document.getElementById("reset-dialog-saved-count");
const autosaveStatusPill = document.getElementById("autosave-status-pill");
const autosaveText = document.getElementById("autosave-text");

// Google Account / OAuth 2.0 Elements
const btnGoogleAccount = document.getElementById("btn-google-account");
const googleAccountModal = document.getElementById("google-account-modal-backdrop");
const btnCloseGoogleModal = document.getElementById("btn-close-google-modal");
const oauthStatusBadge = document.getElementById("oauth-status-badge");
const oauthStatusDesc = document.getElementById("oauth-status-desc");
const btnOAuthSignIn = document.getElementById("btn-oauth-signin");
const inputOAuthClientId = document.getElementById("input-oauth-client-id");
const inputOAuthClientSecret = document.getElementById("input-oauth-client-secret");
const btnSaveOAuthCreds = document.getElementById("btn-save-oauth-creds");
const btnOAuthPopup = document.getElementById("btn-oauth-popup");
const btnOAuthSignout = document.getElementById("btn-oauth-signout");
const btnSyncSheets = document.getElementById("btn-sync-sheets");
const btnModalSyncSheets = document.getElementById("btn-modal-sync-sheets");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  loadSavedState();
  setPosterTheme(state.selectedPosterTheme || "red");
  initMatchesState();
  renderTeamInputs();
  bindEvents();
  updateFilledCount();
  handleOAuthCallbackFromUrl();
  checkOAuthStatusUI();

  if (state.activeScreen === "tournament") {
    showTournamentScreen();
  }
});

/**
 * Initialize or sync match storage structure
 */
function initMatchesState() {
  const total = state.totalMatches || 6;
  if (!Array.isArray(state.matches) || state.matches.length !== total) {
    const existing = Array.isArray(state.matches) ? state.matches : [];
    state.matches = [];
    for (let i = 0; i < total; i++) {
      if (existing[i]) {
        state.matches.push(existing[i]);
      } else {
        state.matches.push({
          matchNumber: i + 1,
          isSaved: false,
          teamData: state.teams.map((teamName) => ({
            teamName,
            placement: "",
            kills: 0,
            minus: 0
          }))
        });
      }
    }
  } else {
    // Sync team names if updated
    state.matches.forEach((m) => {
      if (!m.teamData || m.teamData.length !== 12) {
        m.teamData = state.teams.map((teamName) => ({
          teamName,
          placement: "",
          kills: 0,
          minus: 0
        }));
      } else {
        m.teamData.forEach((td, idx) => {
          td.teamName = state.teams[idx] || td.teamName;
        });
      }
    });
  }
}

/**
 * Render the 12 Team Input Cards in setup screen with 4 player roster per team
 */
function renderTeamInputs() {
  teamsInputContainer.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const slotNumber = String(i + 1).padStart(2, "0");
    const currentVal = state.teams[i] || "";
    const currentRoster = (state.teamRosters && state.teamRosters[i]) || ["", "", "", ""];

    const slotCard = document.createElement("div");
    slotCard.className = "team-slot-card";

    // Top row: Slot badge + Team Name input
    const topRow = document.createElement("div");
    topRow.className = "team-slot-top-row";

    const badge = document.createElement("div");
    badge.className = "slot-badge";
    if (i === 0) {
      badge.innerHTML = `<span class="crown-slot-icon">👑</span><span class="slot-num">${slotNumber}</span>`;
    } else {
      badge.innerHTML = `<span class="slot-num">${slotNumber}</span>`;
    }

    const inputWrap = document.createElement("div");
    inputWrap.className = "slot-input-wrap";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "team-name-input";
    input.dataset.index = i;
    input.placeholder = `TEAM ${slotNumber} NAME (OPTIONAL)`;
    input.value = currentVal;
    input.maxLength = 50;

    input.addEventListener("input", (e) => {
      state.teams[i] = e.target.value.trim();
      updateFilledCount();
      clearError();
    });

    inputWrap.appendChild(input);
    topRow.appendChild(badge);
    topRow.appendChild(inputWrap);
    slotCard.appendChild(topRow);

    // 4 Players Roster Section
    const playersSec = document.createElement("div");
    playersSec.className = "team-players-section";

    const pLabel = document.createElement("div");
    pLabel.className = "team-players-label";
    pLabel.innerHTML = `<span>🎮 4 PLAYERS ROSTER</span>`;

    const pGrid = document.createElement("div");
    pGrid.className = "team-players-grid";

    for (let pIdx = 0; pIdx < 4; pIdx++) {
      const pWrap = document.createElement("div");
      pWrap.className = "player-input-wrap";

      const pPrefix = document.createElement("span");
      pPrefix.className = "player-p-prefix";
      pPrefix.textContent = `P${pIdx + 1}:`;

      const pInput = document.createElement("input");
      pInput.type = "text";
      pInput.className = "player-name-input";
      pInput.placeholder = `Player ${pIdx + 1}`;
      pInput.value = currentRoster[pIdx] || "";
      pInput.maxLength = 50;

      pInput.addEventListener("input", (e) => {
        if (!state.teamRosters) state.teamRosters = {};
        if (!state.teamRosters[i]) state.teamRosters[i] = ["", "", "", ""];
        state.teamRosters[i][pIdx] = e.target.value.trim();
      });

      pWrap.appendChild(pPrefix);
      pWrap.appendChild(pInput);
      pGrid.appendChild(pWrap);
    }

    playersSec.appendChild(pLabel);
    playersSec.appendChild(pGrid);
    slotCard.appendChild(playersSec);

    teamsInputContainer.appendChild(slotCard);
  }
}

// Example Slot List & Player Lineup from user (Prompt 9)
const SAMPLE_LINEUP_TEXT = `Slot 1: Cg x E-Sports (3 Players)

Dᴀʀᴇ☯Dᴇᴠɪʟ™

15.Crushzz!

15 Wᴏʟғ

Slot 2: T2W ESPORTS 1 (4 Players)

Tɴ ᴠ́ɪɴᴄᴇɴᴢᴏᶠʳ

♛~ᴍᴏᴏɴ|⦅

BKෆமச்சான்ෆ

Ꮗᵰ நிலா

Slot 3: Durex (4 Players)

RFZ ZUKO

SARON 10

BL CʏʙᴇʀGod슸

JENIᴬᵂᴹ ꜞ

Slot 4: Monster Esports (4 Players)

༒︎⚔️கட்டேவன்☂︎༒︎

SG 🅖︎🅤︎🅝︎ᦗ

SAD VILLAN ᦗ

Assᴀssɪɴ G O D π

Slot 5: SeeOurName (4 Players)

ZW FLASH

ZW GTK

TN ÉXE !

chickenᴾᵛᴾᦗ

Slot 6: SOUL REAPERS (4 Players)

FFK࿐FLASH✓

FFK࿐SPIDEY☆࿐

FFK࿐PIKACHU

FFK࿐SNIPER

Slot 7: zoies E-SPORTS (3 Players)

நான் சம்பவம்

Aɴʙᴜ

BLAST 모

Slot 8: MZ.HEROZ (4 Players)

mugulan23451

Mz.ghost02

Mz.TWIN 26

Mz.PRIME

Slot 9: DPI Warriors (4 Players)

Xx!Fixa!

jilla4746U

༒Dxneshᦗ

Tɴ✰KலலாRU

Slot 10: TAZ Elite (4 Players)

TAZ SH4DOW

TG.Rouk24!!

@G.KBABA@

HTG Hasan

Slot 11: TAMIL THUGS (4 Players)

FFK࿐Rᴀᴠɪ

TT ᴘʀɪɴᴄᴇ✓

JV MAN LIVE모

HACrrr !!

Slot 12: OCG ESPORTS (4 Players)

OCG ศหล࿐

VT SARAN ☯

OCG DAMN!

SANTHO X OCG`;

/**
 * Parse Lineup & Slot Registration Text (WhatsApp/Discord format)
 */
function parseSlotList(rawText) {
  if (!rawText || typeof rawText !== "string") return {};

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return {};

  const slots = {};
  let currentSlot = null;

  // Detect whether the input uses explicit "Slot X" / "SX" tokens
  const hasExplicitSlotTokens = lines.some((l) => /^(?:slot|s)\s*\d+[\s.:\-–—]*/i.test(l));

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Remove WhatsApp formatting bold stars e.g. *Slot 1: Team* or *1) Team*
    line = line.replace(/^\*+|\*+$/g, "").trim();

    // 1. Explicit "Slot X" or "S X" e.g. "Slot 1:", "Slot 01 -", "S1:", "Slot 1"
    const explicitSlotMatch = line.match(/^(?:slot|s)\s*(\d+)[\s.:\-–—]*(.*)$/i);
    // 2. Numbered "1. Team Name" or "1) Team Name" (only if text doesn't use explicit Slot tokens)
    const numberedSlotMatch = !explicitSlotMatch && !hasExplicitSlotTokens && line.match(/^(\d+)[\s.:)\]\-–—]+(.*)$/);

    let detectedSlotNum = null;
    let rawTeamName = "";

    if (explicitSlotMatch) {
      detectedSlotNum = parseInt(explicitSlotMatch[1], 10);
      rawTeamName = explicitSlotMatch[2] || "";
    } else if (numberedSlotMatch) {
      const num = parseInt(numberedSlotMatch[1], 10);
      if (num >= 1 && num <= 12) {
        detectedSlotNum = num;
        rawTeamName = numberedSlotMatch[2] || "";
      }
    }

    if (detectedSlotNum !== null && detectedSlotNum >= 1 && detectedSlotNum <= 12) {
      let teamName = rawTeamName.trim();
      // Remove trailing player count e.g. "(3 Players)", "(4 Players)", "[4P]", etc.
      teamName = teamName.replace(/[\(\[\{]\s*\d+\s*(?:players?|p)?\s*[\)\]\}]/gi, "").trim();
      // Remove leading punctuation
      teamName = teamName.replace(/^[:\-–—.)\]\s]+/, "").trim();

      currentSlot = detectedSlotNum;
      slots[currentSlot] = {
        teamName: teamName || `TEAM ${String(currentSlot).padStart(2, "0")}`,
        players: []
      };
      continue;
    }

    // Otherwise, if we have an active slot, this line is a player name (or multiple comma-separated players)
    if (currentSlot !== null && slots[currentSlot]) {
      // Clean player line: remove leading "1.", "1)", "P1:", "Player 1:", "-", "•"
      let cleanedPlayerLine = line.replace(/^(?:(?:p[1-4]|player\s*[1-4]|[1-4])\s*[:.\-–—)\]]\s*|[-•*]\s*)/i, "").trim();

      // Check if players are comma-separated on a single line e.g. "PlayerA, PlayerB, PlayerC, PlayerD"
      if (cleanedPlayerLine.includes(",") && slots[currentSlot].players.length === 0) {
        const parts = cleanedPlayerLine.split(",").map((p) => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (slots[currentSlot].players.length < 4) {
            slots[currentSlot].players.push(p);
          }
        }
      } else if (cleanedPlayerLine.length > 0 && slots[currentSlot].players.length < 4) {
        slots[currentSlot].players.push(cleanedPlayerLine);
      }
    }
  }

  return slots;
}

/**
 * Apply parsed slots into application state and update DOM
 */
function applyParsedSlots(parsedSlots) {
  if (!parsedSlots || typeof parsedSlots !== "object") return 0;
  const slotNums = Object.keys(parsedSlots);
  if (slotNums.length === 0) return 0;

  if (!state.teamRosters) state.teamRosters = {};

  let count = 0;
  for (let i = 0; i < 12; i++) {
    const slotNum = i + 1;
    if (parsedSlots[slotNum]) {
      state.teams[i] = parsedSlots[slotNum].teamName;
      const pList = parsedSlots[slotNum].players || [];
      state.teamRosters[i] = [
        pList[0] || "",
        pList[1] || "",
        pList[2] || "",
        pList[3] || ""
      ];
      count++;
    } else {
      state.teams[i] = "";
      state.teamRosters[i] = ["", "", "", ""];
    }
  }

  // Sync team names into existing match data if initialized
  if (state.matches && state.matches.length > 0) {
    state.matches.forEach((m) => {
      if (m && m.teamData) {
        m.teamData.forEach((td, idx) => {
          if (state.teams[idx] !== undefined) {
            td.teamName = state.teams[idx];
          }
        });
      }
    });
  }

  saveState();
  renderTeamInputs();
  updateFilledCount();
  clearError();

  const teamsCard = document.querySelector(".teams-card");
  if (teamsCard) {
    teamsCard.classList.remove("roster-updated-glow");
    void teamsCard.offsetWidth; // Trigger DOM reflow to restart animation
    teamsCard.classList.add("roster-updated-glow");
  }

  showRosterImportBanner(`🎉 Added ${count} teams & player lineups to Competing Teams!`);
  return count;
}

let rosterBannerTimeout = null;
function showRosterImportBanner(msg) {
  if (!rosterImportBanner || !rosterImportMessage) return;
  rosterImportMessage.textContent = msg;
  rosterImportBanner.style.display = "flex";

  clearTimeout(rosterBannerTimeout);
  rosterBannerTimeout = setTimeout(() => {
    if (rosterImportBanner) {
      rosterImportBanner.style.display = "none";
    }
  }, 4500);
}

function updatePastePreviewUI() {
  if (!pasteLineupTextarea || !pastePreviewCount || !pasteDetectedSummary) return;
  const text = pasteLineupTextarea.value.trim();
  const parsed = parseSlotList(text);
  const count = Object.keys(parsed).length;

  pastePreviewCount.textContent = `${count} / 12 SLOTS DETECTED`;
  if (count > 0) {
    pastePreviewCount.classList.add("has-slots");
  } else {
    pastePreviewCount.classList.remove("has-slots");
  }

  if (count === 0) {
    pasteDetectedSummary.innerHTML = `<span style="color: #6b7280; font-style: italic;">Paste your text above to see live preview...</span>`;
    return;
  }

  pasteDetectedSummary.innerHTML = "";
  for (let s = 1; s <= 12; s++) {
    if (parsed[s]) {
      const item = document.createElement("div");
      item.className = "paste-summary-item";
      const pStr = parsed[s].players.length > 0 ? parsed[s].players.join(", ") : "No players listed";
      item.innerHTML = `
        <span class="paste-item-team">Slot ${s}: ${parsed[s].teamName}</span>
        <span class="paste-item-players" title="${pStr}">${pStr}</span>
      `;
      pasteDetectedSummary.appendChild(item);
    }
  }
}

/**
 * Event Bindings
 */
function bindEvents() {
  // Total Matches quick chips
  matchChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      matchChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const matches = parseInt(chip.dataset.matches, 10);
      totalMatchesInput.value = matches;
      state.totalMatches = matches;
      clearError();
    });
  });

  // Direct number input
  totalMatchesInput.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    state.totalMatches = isNaN(val) ? 1 : val;

    matchChips.forEach((chip) => {
      if (parseInt(chip.dataset.matches, 10) === val) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });
    clearError();
  });

  // Tournament title input
  tournamentNameInput.addEventListener("input", (e) => {
    state.tournamentTitle = e.target.value.trim() || "NZ PAID SCRIMS";
  });

  // Autofill button
  btnQuickFill.addEventListener("click", () => {
    state.teams = [...DEFAULT_TEAMS];
    const inputs = teamsInputContainer.querySelectorAll(".team-name-input");
    inputs.forEach((input, idx) => {
      input.value = DEFAULT_TEAMS[idx] || "";
    });
    updateFilledCount();
    clearError();
  });

  // Clear teams button
  btnClearTeams.addEventListener("click", () => {
    if (confirm("Clear all 12 team names?")) {
      state.teams = Array(12).fill("");
      const inputs = teamsInputContainer.querySelectorAll(".team-name-input");
      inputs.forEach((input) => {
        input.value = "";
      });
      updateFilledCount();
    }
  });

  // --- Roster Actions & Paste Lineup Modal Events (Prompt 9) ---
  if (btnOpenPasteModal && pasteLineupModalBackdrop) {
    btnOpenPasteModal.addEventListener("click", () => {
      pasteLineupModalBackdrop.style.display = "flex";
      if (pasteLineupTextarea) {
        if (!pasteLineupTextarea.value.trim()) {
          pasteLineupTextarea.value = SAMPLE_LINEUP_TEXT;
        }
        updatePastePreviewUI();
        pasteLineupTextarea.focus();
      }
    });
  }

  function closePasteLineupModal() {
    if (pasteLineupModalBackdrop) {
      pasteLineupModalBackdrop.style.display = "none";
    }
  }

  if (btnClosePasteModal) btnClosePasteModal.addEventListener("click", closePasteLineupModal);
  if (btnCancelPasteModal) btnCancelPasteModal.addEventListener("click", closePasteLineupModal);
  if (pasteLineupModalBackdrop) {
    pasteLineupModalBackdrop.addEventListener("click", (e) => {
      if (e.target === pasteLineupModalBackdrop) closePasteLineupModal();
    });
  }

  if (pasteLineupTextarea) {
    pasteLineupTextarea.addEventListener("input", updatePastePreviewUI);
  }

  if (btnLoadSampleLineup && pasteLineupTextarea) {
    btnLoadSampleLineup.addEventListener("click", () => {
      pasteLineupTextarea.value = SAMPLE_LINEUP_TEXT;
      updatePastePreviewUI();
    });
  }

  if (btnConfirmImportLineup && pasteLineupTextarea) {
    btnConfirmImportLineup.addEventListener("click", () => {
      const text = pasteLineupTextarea.value.trim();
      const parsed = parseSlotList(text);
      const count = Object.keys(parsed).length;
      if (count === 0) {
        alert("⚠️ No valid slots detected. Please make sure slots are formatted like 'Slot 1: Team Name'.");
        return;
      }
      applyParsedSlots(parsed);
      closePasteLineupModal();
    });
  }

  if (btnQuickFillSetup) {
    btnQuickFillSetup.addEventListener("click", () => {
      const parsed = parseSlotList(SAMPLE_LINEUP_TEXT);
      applyParsedSlots(parsed);
    });
  }

  if (btnClearAllSetup) {
    btnClearAllSetup.addEventListener("click", () => {
      if (confirm("Clear all 12 teams and player rosters?")) {
        state.teams = Array(12).fill("");
        state.teamRosters = {};
        for (let i = 0; i < 12; i++) state.teamRosters[i] = ["", "", "", ""];
        if (messySlotTextarea) messySlotTextarea.value = "";
        saveState();
        renderTeamInputs();
        updateFilledCount();
        clearError();
      }
    });
  }

  // Dedicated MESSY SLOT LIST RAW IMPORTER panel bindings
  if (btnPasteSampleMessy && messySlotTextarea) {
    btnPasteSampleMessy.addEventListener("click", () => {
      messySlotTextarea.value = SAMPLE_LINEUP_TEXT;
      const parsed = parseSlotList(SAMPLE_LINEUP_TEXT);
      applyParsedSlots(parsed);
      messySlotTextarea.focus();
    });
  }

  if (btnCleanParseSlots && messySlotTextarea) {
    btnCleanParseSlots.addEventListener("click", () => {
      const text = messySlotTextarea.value.trim();
      if (!text) {
        showRosterImportBanner("⚠️ Please paste your slot list text into the box first!");
        messySlotTextarea.focus();
        return;
      }
      const parsed = parseSlotList(text);
      const count = applyParsedSlots(parsed);
      if (count === 0) {
        showRosterImportBanner("⚠️ No slots detected. Please check format (e.g. 'Slot 1: Team Name') and try again.");
      } else if (window.innerWidth <= 1024) {
        const teamsCard = document.querySelector(".teams-card");
        if (teamsCard) {
          teamsCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  }

  if (messySlotTextarea) {
    messySlotTextarea.addEventListener("paste", () => {
      setTimeout(() => {
        const text = messySlotTextarea.value.trim();
        if (text) {
          const parsed = parseSlotList(text);
          if (Object.keys(parsed).length > 0) {
            applyParsedSlots(parsed);
          }
        }
      }, 50);
    });
  }

  // Global Paste Interceptor on Setup Screen:
  // When user pastes a WhatsApp/Discord slot list anywhere on the setup screen, auto-parse and fill!
  document.addEventListener("paste", (e) => {
    if (state.activeScreen !== "setup") return;
    if (e.target && (e.target.id === "paste-lineup-textarea" || e.target.id === "messy-slot-textarea")) return;

    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    const pastedText = clipboardData.getData("text");
    if (!pastedText) return;

    // Check if the pasted text looks like a slot list (contains "slot" or has >= 2 non-empty lines)
    if (/slot\s*\d+/i.test(pastedText) || pastedText.split(/\r?\n/).filter((l) => l.trim().length > 0).length >= 3) {
      const parsed = parseSlotList(pastedText);
      const numSlots = Object.keys(parsed).length;
      if (numSlots > 0) {
        e.preventDefault();
        applyParsedSlots(parsed);
      }
    }
  });

  // Start Tournament Button
  btnStartTournament.addEventListener("click", handleStartTournament);

  // Back to setup button
  btnBackSetup.addEventListener("click", () => {
    state.activeScreen = "setup";
    saveState();
    showSetupScreen();
  });

  // Reset Tournament Button - Triggers Confirmation Modal (Prompt 6)
  if (btnResetTournament) {
    btnResetTournament.addEventListener("click", openResetConfirmationModal);
  }

  // Reset Modal Controls (Prompt 6)
  if (btnCloseResetModal) {
    btnCloseResetModal.addEventListener("click", closeResetConfirmationModal);
  }
  if (btnCancelReset) {
    btnCancelReset.addEventListener("click", closeResetConfirmationModal);
  }
  if (resetModalBackdrop) {
    resetModalBackdrop.addEventListener("click", (e) => {
      if (e.target === resetModalBackdrop) closeResetConfirmationModal();
    });
  }
  if (btnConfirmReset) {
    btnConfirmReset.addEventListener("click", handleExecuteTournamentReset);
  }

  // Tournament Sub-navigation (Matches vs Leaderboard vs Matrix)
  tabBtnMatches.addEventListener("click", () => switchSubView("view-match-input"));
  tabBtnLeaderboard.addEventListener("click", () => switchSubView("view-leaderboard"));
  if (tabBtnMatrix) {
    tabBtnMatrix.addEventListener("click", () => switchSubView("view-matrix"));
  }

  // Match dropdown selector change
  matchSelectDropdown.addEventListener("change", (e) => {
    const matchIdx = parseInt(e.target.value, 10);
    selectMatch(matchIdx);
  });

  // Save Match Data Button (Prompt 2)
  btnSaveMatchData.addEventListener("click", handleSaveMatchData);

  // Quick Auto-Assign unique ranks helper
  btnQuickFillScores.addEventListener("click", handleAutoAssignRanks);

  // Reset match inputs helper
  btnResetMatchInputs.addEventListener("click", handleResetCurrentMatch);

  // Leaderboard Refresh / Pull Latest Data Button (Prompt 4)
  if (btnRefreshLeaderboard) {
    btnRefreshLeaderboard.addEventListener("click", () => {
      btnRefreshLeaderboard.classList.add("refreshing");
      renderLeaderboardRows();
      renderMatrixTable();
      setTimeout(() => {
        btnRefreshLeaderboard.classList.remove("refreshing");
      }, 400);
    });
  }

  // Position Display Mode Toggles (Prompt 4: Cumulative Points vs Average Placement)
  if (btnModePoints && btnModeAvg) {
    btnModePoints.addEventListener("click", () => {
      state.positionDisplayMode = "points";
      btnModePoints.classList.add("active");
      btnModeAvg.classList.remove("active");
      renderLeaderboardRows();
    });

    btnModeAvg.addEventListener("click", () => {
      state.positionDisplayMode = "average";
      btnModeAvg.classList.add("active");
      btnModePoints.classList.remove("active");
      renderLeaderboardRows();
    });
  }

  // Poster Template Theme Switcher (All 7 Themes)
  document.querySelectorAll(".theme-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      if (theme) setPosterTheme(theme);
    });
  });
  if (btnThemeRed) btnThemeRed.addEventListener("click", () => setPosterTheme("red"));
  if (btnThemeCyan) btnThemeCyan.addEventListener("click", () => setPosterTheme("cyan"));
  if (btnThemeGreen) btnThemeGreen.addEventListener("click", () => setPosterTheme("green"));
  if (btnThemeOrange) btnThemeOrange.addEventListener("click", () => setPosterTheme("orange"));
  if (btnThemePink) btnThemePink.addEventListener("click", () => setPosterTheme("pink"));
  if (btnThemeCyanPurple) btnThemeCyanPurple.addEventListener("click", () => setPosterTheme("cyan-purple"));
  if (btnThemePurpleBlue) btnThemePurpleBlue.addEventListener("click", () => setPosterTheme("purple-blue"));

  // Download Results & Poster as Image (Prompt 5)
  if (btnDownloadResultsBottom) {
    btnDownloadResultsBottom.addEventListener("click", () => {
      handleExportResults(state.exportFormat || "jpg");
    });
  }

  if (btnDownloadPoster) {
    btnDownloadPoster.addEventListener("click", () => {
      handleExportResults(state.exportFormat || "jpg");
    });
  }

  if (btnFormatPng && btnFormatJpg) {
    btnFormatPng.addEventListener("click", () => {
      state.exportFormat = "png";
      btnFormatPng.classList.add("active");
      btnFormatJpg.classList.remove("active");
    });

    btnFormatJpg.addEventListener("click", () => {
      state.exportFormat = "jpg";
      btnFormatJpg.classList.add("active");
      btnFormatPng.classList.remove("active");
    });
  }

  if (btnCloudBackup) {
    btnCloudBackup.addEventListener("click", handleCloudDriveBackup);
  }

  if (btnExportToDrive) {
    btnExportToDrive.addEventListener("click", () => {
      handleCloudDrivePosterExport(state.exportFormat || "jpg");
    });
  }

  // Modal Close
  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeTeamBreakdownModal);
  }
  if (teamModalBackdrop) {
    teamModalBackdrop.addEventListener("click", (e) => {
      if (e.target === teamModalBackdrop) closeTeamBreakdownModal();
    });
  }

  // Google Account / OAuth 2.0 Modal Controls
  if (btnGoogleAccount) {
    btnGoogleAccount.addEventListener("click", openGoogleAccountModal);
  }
  if (btnCloseGoogleModal) {
    btnCloseGoogleModal.addEventListener("click", closeGoogleAccountModal);
  }
  if (googleAccountModal) {
    googleAccountModal.addEventListener("click", (e) => {
      if (e.target === googleAccountModal) closeGoogleAccountModal();
    });
  }
  if (btnOAuthSignIn) {
    btnOAuthSignIn.addEventListener("click", handleOAuthSignInClick);
  }
  if (btnOAuthPopup) {
    btnOAuthPopup.addEventListener("click", handleOAuthSignInPopup);
  }
  if (btnOAuthSignout) {
    btnOAuthSignout.addEventListener("click", handleOAuthSignOut);
  }
  if (btnSaveOAuthCreds) {
    btnSaveOAuthCreds.addEventListener("click", handleSaveOAuthCreds);
  }
  if (btnSyncSheets) {
    btnSyncSheets.addEventListener("click", handleSyncAllMatchesToSheets);
  }
  if (btnModalSyncSheets) {
    btnModalSyncSheets.addEventListener("click", handleSyncAllMatchesToSheets);
  }
}

/**
 * Handle Start Tournament Action & Validation
 */
function handleStartTournament() {
  clearError();

  const matches = parseInt(totalMatchesInput.value, 10);
  if (isNaN(matches) || matches <= 0) {
    showError("Please enter a valid number of matches (at least 1).");
    totalMatchesInput.focus();
    return;
  }
  state.totalMatches = matches;

  const title = tournamentNameInput.value.trim();
  state.tournamentTitle = title || "NZ PAID SCRIMS";

  // Collect registered teams (NO LONGER COMPULSORY 12 - at least 1 team is required)
  const inputs = teamsInputContainer.querySelectorAll(".team-name-input");
  const enteredTeams = [];

  inputs.forEach((input, idx) => {
    const val = input.value.trim();
    if (val) {
      enteredTeams.push({ name: val, index: idx });
    }
  });

  if (enteredTeams.length === 0) {
    showError("Please enter at least 1 team name to start the tournament.");
    if (inputs[0]) inputs[0].focus();
    return;
  }

  // Check for duplicate team names among entered teams
  const teamNames = enteredTeams.map((t) => t.name);
  const uniqueNames = new Set(teamNames.map((n) => n.toUpperCase()));
  if (uniqueNames.size !== teamNames.length) {
    showError("Each entered team name must be unique. Please resolve duplicate team names.");
    return;
  }

  // Save entered teams into state.teams
  state.teams = teamNames;

  // Remap teamRosters to match the active teams
  const newRosters = {};
  enteredTeams.forEach((item, newIdx) => {
    if (state.teamRosters && state.teamRosters[item.index]) {
      newRosters[newIdx] = state.teamRosters[item.index];
    } else {
      newRosters[newIdx] = ["", "", "", ""];
    }
  });
  state.teamRosters = newRosters;

  initMatchesState();
  state.activeScreen = "tournament";
  state.selectedMatchIndex = 0;
  saveState();

  showTournamentScreen();
}

/**
 * Switch to Setup Screen
 */
function showSetupScreen() {
  tournamentScreen.classList.remove("active");
  setupScreen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Switch to Tournament Screen (Screen 2)
 */
function showTournamentScreen() {
  setupScreen.classList.remove("active");
  tournamentScreen.classList.add("active");

  activeTournamentTitleEl.textContent = state.tournamentTitle.toUpperCase();
  displayTotalMatchesEl.textContent = state.totalMatches;

  renderMatchSelectors();
  renderMatchTeamForms();
  updateProgressBadge();
  renderLeaderboardRows();
  renderMatrixTable();
  switchSubView(state.activeSubView || "view-match-input");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Switch between Subviews (Match Input vs Leaderboard vs Matrix)
 */
function switchSubView(viewId) {
  state.activeSubView = viewId;

  tabBtnMatches.classList.toggle("active", viewId === "view-match-input");
  tabBtnLeaderboard.classList.toggle("active", viewId === "view-leaderboard");
  if (tabBtnMatrix) tabBtnMatrix.classList.toggle("active", viewId === "view-matrix");

  viewMatchInput.classList.toggle("active", viewId === "view-match-input");
  viewLeaderboard.classList.toggle("active", viewId === "view-leaderboard");
  if (viewMatrix) viewMatrix.classList.toggle("active", viewId === "view-matrix");

  if (viewId === "view-leaderboard") {
    renderLeaderboardRows(); // Automatically pulls latest calculated cumulative data
  } else if (viewId === "view-matrix") {
    renderMatrixTable();
  }
}

/**
 * Render Match Selector Dropdown and Tabs Strip (Prompt 2 & 7)
 */
function renderMatchSelectors() {
  matchSelectDropdown.innerHTML = "";
  matchTabsContainer.innerHTML = "";

  for (let i = 0; i < state.totalMatches; i++) {
    const matchNum = i + 1;
    const matchData = state.matches[i];
    const isSaved = matchData && matchData.isSaved;

    // Dropdown Option
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Match ${matchNum} ${isSaved ? "(Saved ✓ - Click to Edit)" : "(Pending)"}`;
    if (i === state.selectedMatchIndex) option.selected = true;
    matchSelectDropdown.appendChild(option);

    // Tab Button
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.className = `match-tab-btn ${i === state.selectedMatchIndex ? "active" : ""} ${isSaved ? "saved" : ""}`;
    tabBtn.dataset.index = i;
    
    // In Prompt 7: Add an explicit ✏️ Edit badge if the match is already saved
    let tabContent = `
      <span class="tab-status-dot"></span>
      <span>MATCH ${matchNum}</span>
    `;
    if (isSaved) {
      tabContent += `<span class="tab-edit-pill">✏️ EDIT</span>`;
    }

    tabBtn.innerHTML = tabContent;

    tabBtn.addEventListener("click", () => {
      selectMatch(i);
    });

    matchTabsContainer.appendChild(tabBtn);
  }

  renderCompletedMatchesManager();
  updateActiveMatchBanner();
}

/**
 * Render Prompt 7: Completed Matches Edit & Correction Access Strip
 */
function renderCompletedMatchesManager() {
  if (!completedMatchesPills) return;

  completedMatchesPills.innerHTML = "";
  const savedMatches = state.matches
    .map((m, idx) => ({ match: m, index: idx }))
    .filter((item) => item.match && item.match.isSaved);

  if (savedMatches.length === 0) {
    completedMatchesPills.innerHTML = `
      <span class="no-completed-msg">No matches saved yet. Save a match to enable quick edit corrections.</span>
    `;
    return;
  }

  savedMatches.forEach(({ match, index }) => {
    const pillBtn = document.createElement("button");
    pillBtn.type = "button";
    pillBtn.className = `match-edit-quick-btn ${index === state.selectedMatchIndex ? "active" : ""}`;
    pillBtn.title = `Click to edit placements and kills for Match ${match.matchNumber}`;
    pillBtn.innerHTML = `
      <span>✏️ Edit Match ${match.matchNumber}</span>
    `;

    pillBtn.addEventListener("click", () => {
      selectMatch(index);
      // If not currently in match input subview, switch over smoothly
      if (state.activeSubView !== "view-match-input") {
        switchSubView("view-match-input");
      }
    });

    completedMatchesPills.appendChild(pillBtn);
  });
}

/**
 * Select active match
 */
function selectMatch(matchIndex) {
  if (matchIndex < 0 || matchIndex >= state.totalMatches) return;
  state.selectedMatchIndex = matchIndex;

  matchSelectDropdown.value = matchIndex;

  const tabs = matchTabsContainer.querySelectorAll(".match-tab-btn");
  tabs.forEach((tab) => {
    const idx = parseInt(tab.dataset.index, 10);
    tab.classList.toggle("active", idx === matchIndex);
  });

  const quickPills = completedMatchesPills ? completedMatchesPills.querySelectorAll(".match-edit-quick-btn") : [];
  quickPills.forEach((pill) => {
    pill.classList.remove("active");
  });

  hideMatchAlerts();
  updateActiveMatchBanner();
  renderMatchTeamForms();
}

/**
 * Update Match Banner Title, Status Pill, and Edit Mode State (Prompt 7)
 */
function updateActiveMatchBanner() {
  const matchNum = state.selectedMatchIndex + 1;
  const matchData = state.matches[state.selectedMatchIndex];
  const isSaved = matchData && matchData.isSaved;

  if (isSaved) {
    // Prompt 7 Edit Mode
    activeMatchTitleText.textContent = `CORRECTING DATA: MATCH ${matchNum}`;
    activeMatchStatusPill.textContent = "✏️ EDIT MODE (SAVED ✓)";
    activeMatchStatusPill.className = "match-status-pill editing";
    if (activeMatchBanner) activeMatchBanner.classList.add("editing-saved-match");
    if (matchEditBanner) matchEditBanner.style.display = "flex";

    // Change Save button visual cue to Update & Recalculate
    if (btnSaveMatchData) btnSaveMatchData.classList.add("btn-edit-mode");
    if (saveMatchBtnText) saveMatchBtnText.textContent = "UPDATE & RECALCULATE MATCH SCORES";
    if (saveMatchBtnIcon) saveMatchBtnIcon.textContent = "⚡";
  } else {
    // Standard Pending Data Entry
    activeMatchTitleText.textContent = `ENTERING DATA: MATCH ${matchNum}`;
    activeMatchStatusPill.textContent = "STATUS: PENDING";
    activeMatchStatusPill.className = "match-status-pill";
    if (activeMatchBanner) activeMatchBanner.classList.remove("editing-saved-match");
    if (matchEditBanner) matchEditBanner.style.display = "none";

    if (btnSaveMatchData) btnSaveMatchData.classList.remove("btn-edit-mode");
    if (saveMatchBtnText) saveMatchBtnText.textContent = "SAVE MATCH DATA";
    if (saveMatchBtnIcon) saveMatchBtnIcon.textContent = "💾";
  }
}

/**
 * Render Team Forms for the selected match with Player Roster hints (Prompt 2 & 3)
 */
function renderMatchTeamForms() {
  matchTeamsGridContainer.innerHTML = "";
  const currentMatch = state.matches[state.selectedMatchIndex];
  if (!currentMatch) return;

  const totalTeamsCount = state.teams.length;

  state.teams.forEach((teamName, teamIdx) => {
    const slotNumber = String(teamIdx + 1).padStart(2, "0");
    const existing = (currentMatch.teamData && currentMatch.teamData[teamIdx]) || {
      placement: "",
      kills: 0,
      minus: 0
    };

    const score = calculateTeamMatchScore(existing.placement, existing.kills, existing.minus);
    const roster = (state.teamRosters && state.teamRosters[teamIdx]) ? state.teamRosters[teamIdx].filter((p) => p && p.trim()) : [];

    const card = document.createElement("div");
    card.className = "match-team-form-card";
    card.dataset.teamIndex = teamIdx;

    // Card Header: Team Name, Mini Badge, and Live Points Formula Preview
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-team-header";

    const metaGroup = document.createElement("div");
    metaGroup.className = "team-meta-group";
    metaGroup.innerHTML = `
      <span class="team-mini-badge">#${slotNumber}</span>
      <span class="team-label-name">${escapeHtml(teamName)}</span>
    `;

    const minusPreview = score.minusPoints > 0 ? ` - ${score.minusPoints} Minus` : "";
    const ptsPreview = document.createElement("div");
    ptsPreview.className = "team-pts-preview";
    ptsPreview.id = `pts-preview-${teamIdx}`;
    ptsPreview.innerHTML = `PTS: <b id="pts-val-${teamIdx}">${score.totalPoints}</b> <span style="font-size:0.75rem;opacity:0.85;margin-left:4px;">(${score.placementPoints} Place + ${score.killPoints} Kills${minusPreview})</span>`;

    cardHeader.appendChild(metaGroup);
    cardHeader.appendChild(ptsPreview);
    card.appendChild(cardHeader);

    // Player Roster Bar (helps admin quickly identify which squad/players are playing)
    if (roster.length > 0) {
      const playersBar = document.createElement("div");
      playersBar.className = "card-team-players-bar";
      playersBar.innerHTML = `<span class="roster-prefix-tag">ROSTER:</span>` +
        roster.map((p) => `<span class="roster-player-chip">👤 ${escapeHtml(p)}</span>`).join("");
      card.appendChild(playersBar);
    }

    // Card Inputs Row: Placement select (1 to totalTeamsCount) and Kills number input
    const inputsRow = document.createElement("div");
    inputsRow.className = "card-inputs-row";

    // Placement Field
    const placementBlock = document.createElement("div");
    placementBlock.className = "field-block";

    const placementLabel = document.createElement("label");
    placementLabel.textContent = `PLACEMENT (1-${totalTeamsCount})`;

    const placementSelect = document.createElement("select");
    placementSelect.className = "placement-select";
    placementSelect.dataset.teamIndex = teamIdx;
    placementSelect.innerHTML = `<option value="">-- Select Placement --</option>`;

    for (let p = 1; p <= totalTeamsCount; p++) {
      const pts = PLACEMENT_POINTS[p] !== undefined ? PLACEMENT_POINTS[p] : 0;
      const opt = document.createElement("option");
      opt.value = p;
      if (p === 1) {
        opt.textContent = `#${p} (Booyah - ${pts} pts)`;
      } else {
        opt.textContent = `#${p} (${pts} pts)`;
      }
      if (String(existing.placement) === String(p)) {
        opt.selected = true;
      }
      placementSelect.appendChild(opt);
    }

    placementSelect.addEventListener("change", (e) => {
      const val = e.target.value ? parseInt(e.target.value, 10) : "";
      if (!currentMatch.teamData[teamIdx]) currentMatch.teamData[teamIdx] = { teamName, kills: 0, minus: 0 };
      currentMatch.teamData[teamIdx].placement = val;

      updateCardPointsPreview(teamIdx);
      checkPlacementConflicts();
    });

    placementBlock.appendChild(placementLabel);
    placementBlock.appendChild(placementSelect);

    // Kills Field
    const killsBlock = document.createElement("div");
    killsBlock.className = "field-block";

    const killsLabel = document.createElement("label");
    killsLabel.textContent = "KILLS (💀 1 PT/KILL)";

    const killsWrap = document.createElement("div");
    killsWrap.className = "kills-input-wrap";
    killsWrap.innerHTML = `<span class="skull-prefix">💀</span>`;

    const killsInput = document.createElement("input");
    killsInput.type = "number";
    killsInput.className = "kills-input";
    killsInput.min = "0";
    killsInput.max = "99";
    killsInput.value = existing.kills !== undefined ? existing.kills : 0;
    killsInput.dataset.teamIndex = teamIdx;

    killsInput.addEventListener("input", (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      if (!currentMatch.teamData[teamIdx]) currentMatch.teamData[teamIdx] = { teamName, placement: "", minus: 0 };
      currentMatch.teamData[teamIdx].kills = val;

      updateCardPointsPreview(teamIdx);
    });

    killsWrap.appendChild(killsInput);
    killsBlock.appendChild(killsLabel);
    killsBlock.appendChild(killsWrap);

    inputsRow.appendChild(placementBlock);
    inputsRow.appendChild(killsBlock);

    card.appendChild(inputsRow);

    // Minus Points Row under Placement Section
    const minusRow = document.createElement("div");
    minusRow.className = "card-minus-row";

    const minusBlock = document.createElement("div");
    minusBlock.className = "minus-field-block";

    const minusLabel = document.createElement("label");
    minusLabel.className = "minus-label";
    minusLabel.innerHTML = `<span>⛔ MINUS POINTS (PENALTY DEDUCTION)</span>`;

    const minusWrap = document.createElement("div");
    minusWrap.className = "minus-input-wrap";
    minusWrap.innerHTML = `<span class="minus-prefix">⛔</span>`;

    const minusInput = document.createElement("input");
    minusInput.type = "number";
    minusInput.className = "minus-input";
    minusInput.min = "0";
    minusInput.max = "99";
    minusInput.value = existing.minus !== undefined ? existing.minus : 0;
    minusInput.dataset.teamIndex = teamIdx;
    minusInput.placeholder = "0";

    minusInput.addEventListener("input", (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      if (!currentMatch.teamData[teamIdx]) currentMatch.teamData[teamIdx] = { teamName, placement: "", kills: 0, minus: 0 };
      currentMatch.teamData[teamIdx].minus = val;

      updateCardPointsPreview(teamIdx);
    });

    minusWrap.appendChild(minusInput);
    minusBlock.appendChild(minusLabel);
    minusBlock.appendChild(minusWrap);
    minusRow.appendChild(minusBlock);

    card.appendChild(minusRow);

    matchTeamsGridContainer.appendChild(card);
  });

  checkPlacementConflicts();
}

/**
 * Update the points preview on a specific team card with explicit formula breakdown
 */
function updateCardPointsPreview(teamIdx) {
  const currentMatch = state.matches[state.selectedMatchIndex];
  if (!currentMatch || !currentMatch.teamData[teamIdx]) return;

  const data = currentMatch.teamData[teamIdx];
  const score = calculateTeamMatchScore(data.placement, data.kills, data.minus);
  const ptsPreviewEl = document.getElementById(`pts-preview-${teamIdx}`);
  if (ptsPreviewEl) {
    const minusPreview = score.minusPoints > 0 ? ` - ${score.minusPoints} Minus` : "";
    ptsPreviewEl.innerHTML = `PTS: <b id="pts-val-${teamIdx}">${score.totalPoints}</b> <span style="font-size:0.75rem;opacity:0.85;margin-left:4px;">(${score.placementPoints} Place + ${score.killPoints} Kills${minusPreview})</span>`;
  }
}

/**
 * Real-time Placement Conflict Detection
 * "Ensure no two teams can have the same placement in a single match."
 */
function checkPlacementConflicts() {
  const currentMatch = state.matches[state.selectedMatchIndex];
  if (!currentMatch) return { hasConflict: false, duplicates: [] };

  const placementMap = {};
  const duplicatePlacements = new Set();

  currentMatch.teamData.forEach((t, idx) => {
    const p = t.placement;
    if (p !== "" && p !== null && p !== undefined) {
      if (placementMap[p] !== undefined) {
        placementMap[p].push(idx);
        duplicatePlacements.add(p);
      } else {
        placementMap[p] = [idx];
      }
    }
  });

  // Highlight conflicting team cards
  const cards = matchTeamsGridContainer.querySelectorAll(".match-team-form-card");
  cards.forEach((card) => {
    const teamIdx = parseInt(card.dataset.teamIndex, 10);
    const select = card.querySelector(".placement-select");
    const p = currentMatch.teamData[teamIdx]?.placement;

    const existingWarning = card.querySelector(".conflict-warning-tag");
    if (existingWarning) existingWarning.remove();

    if (p && duplicatePlacements.has(p)) {
      card.classList.add("has-conflict");
      if (select) select.classList.add("input-error");

      const warnTag = document.createElement("div");
      warnTag.className = "conflict-warning-tag";
      warnTag.innerHTML = `⚠️ Conflict: Another team is also set to Rank #${p}!`;
      card.appendChild(warnTag);
    } else {
      card.classList.remove("has-conflict");
      if (select) select.classList.remove("input-error");
    }
  });

  if (duplicatePlacements.size > 0) {
    const dupList = Array.from(duplicatePlacements).map((p) => `#${p}`).join(", ");
    showMatchAlert(`Duplicate placement detected: ${dupList}. Placements must be unique for all teams!`, "error");
    return { hasConflict: true, duplicates: Array.from(duplicatePlacements) };
  } else {
    if (matchValidationAlert.style.display !== "none" && matchAlertMessage.textContent.includes("Duplicate")) {
      matchValidationAlert.style.display = "none";
    }
    return { hasConflict: false, duplicates: [] };
  }
}

/**
 * Save Match Data Action (Prompt 2, 3 & 4)
 * Automatically updates leaderboard with latest calculated cumulative data
 */
function handleSaveMatchData() {
  hideMatchAlerts();
  const currentMatch = state.matches[state.selectedMatchIndex];
  if (!currentMatch) return;

  const totalTeamsCount = state.teams.length;

  // 1. Check for missing placements
  const unplacedTeams = [];
  currentMatch.teamData.forEach((t, idx) => {
    if (t.placement === "" || t.placement === null || t.placement === undefined) {
      unplacedTeams.push(state.teams[idx]);
    }
  });

  if (unplacedTeams.length > 0) {
    showMatchAlert(`Please assign a placement to all ${totalTeamsCount} teams before saving. Missing: ${unplacedTeams.slice(0, 3).join(", ")}${unplacedTeams.length > 3 ? "..." : ""}`, "error");
    return;
  }

  // 2. Check for duplicate placements
  const conflictCheck = checkPlacementConflicts();
  if (conflictCheck.hasConflict) {
    showMatchAlert(`Cannot save: Placements must be unique for all teams! Found duplicate(s): ${conflictCheck.duplicates.map((p) => `#${p}`).join(", ")}`, "error");
    return;
  }

  // 3. Normalize kills and minus
  currentMatch.teamData.forEach((t) => {
    const k = parseInt(t.kills, 10);
    t.kills = isNaN(k) || k < 0 ? 0 : k;
    const m = parseInt(t.minus, 10);
    t.minus = isNaN(m) || m < 0 ? 0 : m;
  });

  // Determine if this was an edit correction
  const wasPreviouslySaved = currentMatch.isSaved === true;

  // Mark match as saved
  currentMatch.isSaved = true;
  saveState();

  // Automatic real-time updates for leaderboard & matrix (Prompt 4 & 7)
  updateActiveMatchBanner();
  updateProgressBadge();
  renderMatchSelectors();
  renderLeaderboardRows();
  renderMatrixTable();

  const matchNum = state.selectedMatchIndex + 1;
  if (wasPreviouslySaved) {
    showMatchAlert(`Match ${matchNum} corrected! Updating local data and syncing to Google Sheets...`, "success");
  } else {
    showMatchAlert(`Match ${matchNum} saved! Syncing scores to Google Sheets...`, "success");
  }

  // Automatic Google Sheets Synchronization (Scenario B)
  syncMatchScoresToGoogleSheets(matchNum, currentMatch.teamData).catch((err) => {
    console.warn("Google Sheets background sync notice:", err);
  });
}

/**
 * Quick Auto-Assign Unique Ranks Helper (1 to 12)
 */
function handleAutoAssignRanks() {
  const currentMatch = state.matches[state.selectedMatchIndex];
  if (!currentMatch) return;

  const ranks = Array.from({ length: 12 }, (_, i) => i + 1);

  currentMatch.teamData.forEach((t, idx) => {
    t.placement = ranks[idx];
    if (t.kills === undefined || t.kills === 0) {
      t.kills = Math.max(0, Math.floor(Math.random() * 5) + (12 - ranks[idx] > 6 ? 2 : 0));
    }
    if (t.minus === undefined) {
      t.minus = 0;
    }
  });

  renderMatchTeamForms();
  showMatchAlert(`Auto-assigned unique placements 1-12. Click 'SAVE MATCH DATA' to commit.`, "success");
}

/**
 * Clear Current Match Inputs Helper
 */
function handleResetCurrentMatch() {
  if (confirm("Reset inputs for this match?")) {
    const currentMatch = state.matches[state.selectedMatchIndex];
    if (currentMatch) {
      currentMatch.isSaved = false;
      currentMatch.teamData = state.teams.map((teamName) => ({
        teamName,
        placement: "",
        kills: 0,
        minus: 0
      }));
      saveState();
      renderMatchTeamForms();
      updateActiveMatchBanner();
      updateProgressBadge();
      renderMatchSelectors();
      renderLeaderboardRows();
      renderMatrixTable();
      hideMatchAlerts();
    }
  }
}

/**
 * Update Match Progress Badge
 */
function updateProgressBadge() {
  const total = state.totalMatches || 6;
  const savedCount = state.matches.filter((m) => m && m.isSaved).length;
  matchProgressBadge.textContent = `${savedCount} / ${total} SAVED`;
}

/**
 * Show Match Alert (Error or Success)
 */
function showMatchAlert(msg, type = "error") {
  if (type === "error") {
    matchAlertMessage.textContent = msg;
    matchValidationAlert.style.display = "flex";
    matchSuccessAlert.style.display = "none";
  } else {
    matchSuccessMessage.textContent = msg;
    matchSuccessAlert.style.display = "flex";
    matchValidationAlert.style.display = "none";
  }
}

function hideMatchAlerts() {
  matchValidationAlert.style.display = "none";
  matchSuccessAlert.style.display = "none";
}

/**
 * Calculate Cumulative Scores Across All Saved Matches (Prompt 3 & 4)
 * Official Prompt 4 Rules:
 * - Ranked 01 to 12 based on cumulative total points.
 * - Tie-breakers resolved by total kills (eliminations).
 */
function calculateCumulativeStats() {
  const stats = state.teams.map((teamName) => ({
    teamName,
    matchesPlayed: 0,
    placementPoints: 0,
    eliminationPoints: 0, // Total cumulative kills
    minusPoints: 0,       // Total cumulative minus / penalty deduction
    totalPoints: 0,       // Overall cumulative points
    booyahs: 0,
    placementSum: 0,
    averagePlacement: "-",
    matchBreakdown: []    // Stores score details per match
  }));

  state.matches.forEach((match, matchIdx) => {
    const matchNumber = matchIdx + 1;
    const isSaved = match && match.isSaved;

    stats.forEach((teamStat) => {
      if (isSaved && match.teamData) {
        const teamMatchData = match.teamData.find((t) => t.teamName === teamStat.teamName);
        if (teamMatchData && teamMatchData.placement) {
          const p = parseInt(teamMatchData.placement, 10);
          const score = calculateTeamMatchScore(p, teamMatchData.kills, teamMatchData.minus);

          teamStat.matchesPlayed += 1;
          teamStat.placementPoints += score.placementPoints;
          teamStat.eliminationPoints += score.killPoints;
          teamStat.minusPoints += score.minusPoints;
          teamStat.totalPoints += score.totalPoints;
          teamStat.placementSum += p;

          if (p === 1) {
            teamStat.booyahs += 1;
          }

          teamStat.matchBreakdown.push({
            matchNumber,
            placement: p,
            placementPoints: score.placementPoints,
            kills: score.killPoints,
            minus: score.minusPoints,
            totalPoints: score.totalPoints,
            isPlayed: true
          });
          return;
        }
      }

      // If not played or not saved yet
      teamStat.matchBreakdown.push({
        matchNumber,
        placement: "-",
        placementPoints: 0,
        kills: 0,
        minus: 0,
        totalPoints: 0,
        isPlayed: false
      });
    });
  });

  // Calculate Average Placement
  stats.forEach((t) => {
    if (t.matchesPlayed > 0) {
      t.averagePlacement = (t.placementSum / t.matchesPlayed).toFixed(1);
    } else {
      t.averagePlacement = "-";
    }
  });

  // Official Tournament Tie-Breaker Sorting Hierarchy:
  // 1. Primary: Cumulative Total Points (Highest first)
  // 2. Tie-breaker Priority 1: Most Booyahs (1st place finishes)
  // 3. Tie-breaker Priority 2: Higher cumulative Kill Points (Eliminations)
  // 4. Tie-breaker Priority 3: Higher cumulative Placement Points
  stats.sort((a, b) => {
    // Rule 1: Total Points
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // Rule 2 (Tie-breaker Priority 1): Most Booyahs (1st place finishes)
    if (b.booyahs !== a.booyahs) {
      return b.booyahs - a.booyahs;
    }
    // Rule 3 (Tie-breaker Priority 2): Higher cumulative Kill Points (Eliminations)
    if (b.eliminationPoints !== a.eliminationPoints) {
      return b.eliminationPoints - a.eliminationPoints;
    }
    // Rule 4 (Tie-breaker Priority 3): Cumulative Placement Points
    return b.placementPoints - a.placementPoints;
  });

  return stats;
}

/**
 * Animate a numeric element counting up dynamically from 0 to target
 */
function animateCountUp(element, target, duration = 800) {
  const targetNum = parseInt(target, 10);
  if (isNaN(targetNum) || targetNum === 0) {
    element.textContent = "0";
    return;
  }
  if (targetNum < 0) {
    element.textContent = String(targetNum);
    return;
  }

  const startTime = performance.now();
  const badgeParent = element.closest(".row-total-badge");
  if (badgeParent) badgeParent.classList.add("counting");

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(easeProgress * targetNum);
    element.textContent = currentVal;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.textContent = targetNum;
      if (badgeParent) badgeParent.classList.remove("counting");
    }
  }

  requestAnimationFrame(updateCount);
}

/**
 * Full Multi-Poster Template Registry (7 Themes)
 */
const POSTER_THEMES = {
  red: {
    id: "red",
    name: "RED CRIMSON",
    src: "assets/jack_sparrow_template.png",
    layout: "legacy_red",
    glowColor: "rgba(255, 23, 68, 0.9)",
    baseWidth: 847,
    baseHeight: 1024
  },
  cyan: {
    id: "cyan",
    name: "CYAN STORM",
    src: "assets/jack_sparrow_cyan_template.jpg",
    layout: "cyan_725",
    glowColor: "rgba(6, 182, 212, 0.95)",
    baseWidth: 725,
    baseHeight: 1024
  },
  green: {
    id: "green",
    name: "TOXIC GREEN",
    src: "assets/jack_sparrow_green_template.jpg",
    layout: "modern_847",
    glowColor: "rgba(34, 197, 94, 0.95)",
    posColor: "#4ade80",
    elimColor: "#fb923c",
    booyahColor: "#fef08a",
    baseWidth: 847,
    baseHeight: 1024
  },
  orange: {
    id: "orange",
    name: "FLAME ORANGE",
    src: "assets/jack_sparrow_orange_template.jpg",
    layout: "modern_847",
    glowColor: "rgba(249, 115, 22, 0.95)",
    posColor: "#fdba74",
    elimColor: "#f87171",
    booyahColor: "#fef08a",
    baseWidth: 847,
    baseHeight: 1024
  },
  pink: {
    id: "pink",
    name: "NEON MAGENTA",
    src: "assets/jack_sparrow_pink_template.jpg",
    layout: "modern_847",
    glowColor: "rgba(236, 72, 153, 0.95)",
    posColor: "#f472b6",
    elimColor: "#fb923c",
    booyahColor: "#fef08a",
    baseWidth: 847,
    baseHeight: 1024
  },
  "cyan-purple": {
    id: "cyan-purple",
    name: "CYBER VIOLET",
    src: "assets/jack_sparrow_cyan_purple_template.jpg",
    layout: "modern_847",
    glowColor: "rgba(168, 85, 247, 0.95)",
    posColor: "#38bdf8",
    elimColor: "#c084fc",
    booyahColor: "#fef08a",
    baseWidth: 847,
    baseHeight: 1024
  },
  "purple-blue": {
    id: "purple-blue",
    name: "ROYAL INDIGO",
    src: "assets/jack_sparrow_purple_blue_template.jpg",
    layout: "modern_847",
    glowColor: "rgba(139, 92, 246, 0.95)",
    posColor: "#a78bfa",
    elimColor: "#60a5fa",
    booyahColor: "#fef08a",
    baseWidth: 847,
    baseHeight: 1024
  }
};

/**
 * Switch Poster Template Theme ('red' | 'cyan' | 'green' | 'orange' | 'pink' | 'cyan-purple' | 'purple-blue')
 */
function setPosterTheme(theme) {
  if (!POSTER_THEMES[theme]) {
    theme = "red";
  }
  state.selectedPosterTheme = theme;
  const themeConfig = POSTER_THEMES[theme];

  if (scrimsPosterCapture) {
    Object.keys(POSTER_THEMES).forEach((tKey) => {
      scrimsPosterCapture.classList.remove(`theme-${tKey}`);
    });
    scrimsPosterCapture.classList.add(`theme-${theme}`);
  }

  if (posterTemplateBg) {
    posterTemplateBg.src = themeConfig.src;
  }

  const buttons = document.querySelectorAll(".theme-pill-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.theme === theme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  saveState();
  renderLeaderboardRows(false);
}

/**
 * Render Final Leaderboard Table over the Exact Reference Template Image
 * (media_1791710298018_143ad7f8.png)
 * 12 rows aligned directly to the pre-rendered metal slots and red trapezoid badges:
 * - Sequential gaming slide-in from left
 * - Dynamic points count-up from zero
 */
function renderLeaderboardRows(animate = true) {
  scrimsLeaderboardRowsEl.innerHTML = "";
  const cumulativeStats = calculateCumulativeStats();

  // Update Position Header label based on mode
  if (headerPositionLabel) {
    headerPositionLabel.textContent = state.positionDisplayMode === "average" ? "AVG RANK" : "POSITION";
  }

  cumulativeStats.forEach((t, index) => {
    const rank = index + 1;

    const row = document.createElement("div");
    row.className = `overlay-row rank-${rank}`;
    row.title = `Click to view ${t.teamName}'s match breakdown`;

    // Apply sequential gaming slide-in from left
    if (animate) {
      row.classList.add("animate-slide-in");
      row.style.animationDelay = `${index * 55}ms`;
    }

    // Row Click Listener for detailed breakdown modal
    row.addEventListener("click", () => {
      openTeamBreakdownModal(t.teamName);
    });

    // Rank 1 Crown Icon on top of rank 01 badge
    if (rank === 1) {
      const crown = document.createElement("span");
      crown.className = "overlay-crown-icon";
      crown.textContent = "👑";
      row.appendChild(crown);
    }

    // 1. Team Name (precisely aligned over metal slot)
    const teamNameEl = document.createElement("span");
    teamNameEl.className = "overlay-team-name";
    teamNameEl.textContent = t.teamName;

    // 2. Booyah Column (number of 1st place finishes)
    const booyahValEl = document.createElement("span");
    booyahValEl.className = "overlay-booyah-val";
    booyahValEl.textContent = t.booyahs || 0;

    // 3. Position Column (placement points or avg placement)
    const posValEl = document.createElement("span");
    posValEl.className = "overlay-position-val";
    posValEl.textContent = state.positionDisplayMode === "average" ? t.averagePlacement : t.placementPoints;

    // 4. Elimination Column (total cumulative kills)
    const elimValEl = document.createElement("span");
    elimValEl.className = "overlay-elimination-val";
    elimValEl.textContent = t.eliminationPoints;

    // 5. Total Column (centered directly in right red badge with count-up)
    const totalValEl = document.createElement("span");
    totalValEl.className = "overlay-total-val";

    const numSpan = document.createElement("span");
    numSpan.className = "count-up-number";
    totalValEl.appendChild(numSpan);

    if (animate && t.totalPoints > 0) {
      numSpan.textContent = "0";
      setTimeout(() => {
        animateCountUp(numSpan, t.totalPoints, 750);
      }, index * 55 + 100);
    } else {
      numSpan.textContent = t.totalPoints;
    }

    row.appendChild(teamNameEl);
    row.appendChild(booyahValEl);
    row.appendChild(posValEl);
    row.appendChild(elimValEl);
    row.appendChild(totalValEl);

    scrimsLeaderboardRowsEl.appendChild(row);
  });
}

/**
 * Render Cumulative Points Matrix Table (Prompt 3 & 4)
 */
function renderMatrixTable() {
  if (!matrixHeaderRow || !matrixBodyRows) return;

  const totalMatches = state.totalMatches || 6;
  const cumulativeStats = calculateCumulativeStats();

  // 1. Build Header Row
  matrixHeaderRow.innerHTML = `
    <th class="col-rank-num">#</th>
    <th class="col-team-name">TEAM NAME</th>
  `;

  for (let m = 1; m <= totalMatches; m++) {
    const matchIndex = m - 1;
    const isSaved = state.matches[matchIndex] && state.matches[matchIndex].isSaved;
    const th = document.createElement("th");
    th.innerHTML = `
      <div class="matrix-match-header-wrap">
        <span>M${m}</span>
        ${isSaved ? `<button type="button" class="matrix-edit-link" data-match-index="${matchIndex}" title="Edit Match ${m}">✏️ EDIT</button>` : `<span style="font-size:0.6rem;opacity:0.4;">-</span>`}
      </div>
    `;
    const editBtn = th.querySelector(".matrix-edit-link");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectMatch(matchIndex);
        switchSubView("view-match-input");
      });
    }
    matrixHeaderRow.appendChild(th);
  }

  const thPlace = document.createElement("th");
  thPlace.className = "col-total-place";
  thPlace.textContent = "PLACE PTS";

  const thKills = document.createElement("th");
  thKills.className = "col-total-kills";
  thKills.textContent = "KILL PTS";

  const thTotal = document.createElement("th");
  thTotal.className = "col-grand-total";
  thTotal.textContent = "TOTAL";

  matrixHeaderRow.appendChild(thPlace);
  matrixHeaderRow.appendChild(thKills);
  matrixHeaderRow.appendChild(thTotal);

  // 2. Build Body Rows
  matrixBodyRows.innerHTML = "";

  cumulativeStats.forEach((teamStat, idx) => {
    const rank = idx + 1;
    const tr = document.createElement("tr");

    tr.addEventListener("click", () => {
      openTeamBreakdownModal(teamStat.teamName);
    });

    let rowHtml = `
      <td class="col-rank-num">${String(rank).padStart(2, "0")}</td>
      <td class="col-team-name">${escapeHtml(teamStat.teamName)}</td>
    `;

    // Match columns
    for (let m = 0; m < totalMatches; m++) {
      const matchScore = teamStat.matchBreakdown[m];
      if (matchScore && matchScore.isPlayed) {
        rowHtml += `
          <td class="match-cell">
            ${matchScore.totalPoints}
            <span class="match-cell-sub">#${matchScore.placement} (${matchScore.kills}k${matchScore.minus > 0 ? ` -${matchScore.minus}` : ""})</span>
          </td>
        `;
      } else {
        rowHtml += `
          <td class="match-cell" style="opacity: 0.35;">-</td>
        `;
      }
    }

    // Cumulative Summaries
    rowHtml += `
      <td class="col-total-place">${teamStat.placementPoints}</td>
      <td class="col-total-kills">${teamStat.eliminationPoints}</td>
      <td class="col-grand-total">${teamStat.totalPoints}</td>
    `;

    tr.innerHTML = rowHtml;
    matrixBodyRows.appendChild(tr);
  });
}

/**
 * Download Results as High-Resolution Image (Prompt 5)
 * Captures the leaderboard HTML element using html2canvas with fallback
 */
/**
 * Download Results as High-Resolution Image (Prompt 5)
 * Renders directly onto the high-resolution Jack Sparrow Scrims template image
 * ensuring 100% pixel-perfect text placement inside every slot and badge.
 */
async function handleExportResults(format = "jpg") {
  const btnTextEl = document.getElementById("download-results-btn-text");
  const originalText = btnTextEl ? btnTextEl.textContent : "DOWNLOAD RESULTS";

  // Visual Loading Feedback
  if (btnTextEl) btnTextEl.textContent = "GENERATING...";
  if (btnDownloadResultsBottom) btnDownloadResultsBottom.classList.add("downloading");
  if (exportStatusMessage) exportStatusMessage.textContent = "⏳ Generating high-definition results image...";

  const safeTitle = (state.tournamentTitle || "Tournament").replace(/[^a-zA-Z0-9_-]/g, "_");
  const ext = format === "png" ? "png" : "jpg";
  const filename = `FreeFire_${safeTitle}_Leaderboard_${Date.now()}.${ext}`;

  try {
    fallbackCanvasExport(format, filename);
  } catch (err) {
    console.error("Export error:", err);
    if (exportStatusMessage) {
      exportStatusMessage.textContent = "⚠️ Error generating image. Please try again.";
    }
  } finally {
    // Reset button states
    if (btnTextEl) btnTextEl.textContent = originalText;
    if (btnDownloadResultsBottom) btnDownloadResultsBottom.classList.remove("downloading");
  }
}

/**
 * Trigger browser file download via data URL
 */
function triggerFileDownload(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Built-in Canvas Renderer: Renders pixel-perfect text onto the exact active template graphic
 * Supports all 7 Themes: Red Crimson, Cyan Storm, Toxic Green, Flame Orange, Neon Magenta, Cyber Violet, Royal Indigo
 */
function drawPosterCanvas(canvas, ctx, img, theme = "red") {
  const themeConfig = POSTER_THEMES[theme] || POSTER_THEMES.red;
  const isCyan = themeConfig.layout === "cyan_725";
  const isModern = themeConfig.layout === "modern_847";
  const cumulativeStats = calculateCumulativeStats();

  canvas.width = (img.naturalWidth || themeConfig.baseWidth) * 2;
  canvas.height = (img.naturalHeight || themeConfig.baseHeight) * 2;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (isModern) {
    // Modern 847x1024 Templates (1694 x 2048 at 2x Retina): Green, Orange, Pink, Cyber Violet, Royal Indigo
    const modernSlotCenters = [378, 422.5, 467, 511.5, 556, 600.5, 645, 689.5, 734, 778.5, 823, 868];
    const rowHeight = (canvas.height * (535 / 1024)) / 12;

    const crownFontSize = Math.round(canvas.width * 0.021);
    const teamFontSize = Math.round(canvas.width * 0.022);
    const numFontSize = Math.round(canvas.width * 0.023);
    const totalFontSize = Math.round(canvas.width * 0.027);

    const posColor = themeConfig.posColor || "#4ade80";
    const elimColor = themeConfig.elimColor || "#fb923c";
    const booyahColor = themeConfig.booyahColor || "#fef08a";
    const totalGlow = themeConfig.glowColor || "rgba(255, 255, 255, 0.9)";

    cumulativeStats.forEach((t, i) => {
      if (i >= 12) return;
      const rowCenterY = canvas.height * (modernSlotCenters[i] / 1024);
      const rank = i + 1;

      // Crown on Rank 1 (#01)
      if (rank === 1) {
        ctx.font = `bold ${crownFontSize}px sans-serif`;
        ctx.fillStyle = "#ffeb3b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👑", canvas.width * 0.112, rowCenterY - rowHeight * 0.42);
      }

      // 1. Team Name (Slot: 19.8% to 43.5%)
      ctx.font = `bold ${teamFontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let displayName = t.teamName.toUpperCase();
      const maxTextWidth = canvas.width * 0.235;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, canvas.width * 0.198, rowCenterY);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // In Modern 847: Column order is POS -> ELIM -> BOOYAH -> TOTAL
      // 2. Position Column (under POS header: center 50.53%)
      ctx.font = `bold ${numFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = posColor;
      ctx.shadowColor = posColor;
      ctx.shadowBlur = 6;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const posText = state.positionDisplayMode === "average" ? String(t.averagePlacement) : String(t.placementPoints);
      ctx.fillText(posText, canvas.width * 0.5053, rowCenterY);

      // 3. Elimination Column (under ELIM header: center 62.93%)
      ctx.fillStyle = elimColor;
      ctx.shadowColor = elimColor;
      ctx.shadowBlur = 6;
      ctx.fillText(String(t.eliminationPoints), canvas.width * 0.6293, rowCenterY);

      // 4. Booyah Column (under BOOYAH header: center 74.38%)
      ctx.fillStyle = booyahColor;
      ctx.shadowColor = booyahColor;
      ctx.shadowBlur = 6;
      ctx.fillText(String(t.booyahs || 0), canvas.width * 0.7438, rowCenterY);

      // 5. Total Column (under colored trapezoids: center 88.08%)
      ctx.font = `900 ${totalFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = totalGlow;
      ctx.shadowBlur = 10;
      ctx.fillText(String(t.totalPoints), canvas.width * 0.8808, rowCenterY);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });
  } else if (isCyan) {
    // Cyan Template (725 x 1024 base -> 1450 x 2048 at 2x Retina)
    const cyanSlotCenters = [406.75, 443, 479, 514.75, 550.75, 587.25, 623.75, 660.25, 696.5, 732.5, 768.5, 804.5];
    const rowHeight = (canvas.height * (434 / 1024)) / 12;

    const crownFontSize = Math.round(canvas.width * 0.022);
    const teamFontSize = Math.round(canvas.width * 0.022);
    const numFontSize = Math.round(canvas.width * 0.024);
    const totalFontSize = Math.round(canvas.width * 0.028);

    cumulativeStats.forEach((t, i) => {
      if (i >= 12) return;
      const rowCenterY = canvas.height * (cyanSlotCenters[i] / 1024);
      const rank = i + 1;

      // Crown on Rank 1 (#01)
      if (rank === 1) {
        ctx.font = `bold ${crownFontSize}px sans-serif`;
        ctx.fillStyle = "#ffeb3b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👑", canvas.width * 0.128, rowCenterY - rowHeight * 0.45);
      }

      // 1. Team Name (Slot: 19.0% to 47.5%)
      ctx.font = `bold ${teamFontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let displayName = t.teamName.toUpperCase();
      const maxTextWidth = canvas.width * 0.28;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, canvas.width * 0.190, rowCenterY);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // In Cyan: Column order is POS -> ELIM -> BOOYAH -> TOTAL
      // 2. Position Column (under POS header: center 53.31%)
      ctx.font = `bold ${numFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
      ctx.shadowBlur = 6;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const posText = state.positionDisplayMode === "average" ? String(t.averagePlacement) : String(t.placementPoints);
      ctx.fillText(posText, canvas.width * 0.5331, rowCenterY);

      // 3. Elimination Column (under ELIM header: center 64.21%)
      ctx.fillStyle = "#fb923c";
      ctx.shadowColor = "rgba(251, 146, 60, 0.8)";
      ctx.shadowBlur = 6;
      ctx.fillText(String(t.eliminationPoints), canvas.width * 0.6421, rowCenterY);

      // 4. Booyah Column (under BOOYAH header: center 76.0%)
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "rgba(254, 240, 138, 0.8)";
      ctx.shadowBlur = 6;
      ctx.fillText(String(t.booyahs || 0), canvas.width * 0.760, rowCenterY);

      // 5. Total Column (under cyan trapezoids: center 88.97%)
      ctx.font = `900 ${totalFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(6, 182, 212, 0.95)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(t.totalPoints), canvas.width * 0.8897, rowCenterY);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });
  } else {
    // Red Template (847 x 1024 base -> 1694 x 2048 at 2x Retina)
    const redSlotCenters = [378, 423, 467, 510.5, 554.5, 599, 642.5, 686, 730.5, 775.5, 821, 869];
    const rowHeight = (canvas.height * (539 / 1024)) / 12;

    const crownFontSize = Math.round(canvas.width * 0.021);
    const teamFontSize = Math.round(canvas.width * 0.022);
    const numFontSize = Math.round(canvas.width * 0.023);
    const totalFontSize = Math.round(canvas.width * 0.026);

    cumulativeStats.forEach((t, i) => {
      if (i >= 12) return;
      const rowCenterY = canvas.height * (redSlotCenters[i] / 1024);
      const rank = i + 1;

      if (rank === 1) {
        ctx.font = `bold ${crownFontSize}px sans-serif`;
        ctx.fillStyle = "#ffeb3b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👑", canvas.width * 0.108, rowCenterY - rowHeight * 0.40);
      }

      // 1. Team Name (Slot: 17.5% to 45.0%)
      ctx.font = `bold ${teamFontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let displayName = t.teamName.toUpperCase();
      const maxTextWidth = canvas.width * 0.27;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, canvas.width * 0.178, rowCenterY);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // In Red: Column order is BOOYAH -> POS -> ELIM -> TOTAL
      // 2. Booyah (center 51.0%)
      ctx.font = `bold ${numFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#fef08a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(254, 240, 138, 0.7)";
      ctx.shadowBlur = 6;
      ctx.fillText(String(t.booyahs || 0), canvas.width * 0.510, rowCenterY);

      // 3. Position (center 62.7%)
      ctx.fillStyle = "#93c5fd";
      ctx.shadowColor = "rgba(147, 197, 253, 0.7)";
      ctx.shadowBlur = 6;
      const posText = state.positionDisplayMode === "average" ? String(t.averagePlacement) : String(t.placementPoints);
      ctx.fillText(posText, canvas.width * 0.627, rowCenterY);

      // 4. Elimination (center 74.0%)
      ctx.fillStyle = "#fca5a5";
      ctx.shadowColor = "rgba(252, 165, 165, 0.7)";
      ctx.shadowBlur = 6;
      ctx.fillText(String(t.eliminationPoints), canvas.width * 0.740, rowCenterY);

      // 5. Total (center 87.8%)
      ctx.font = `900 ${totalFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(255, 23, 68, 0.9)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(t.totalPoints), canvas.width * 0.878, rowCenterY);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });
  }
}

/**
 * Loads the active template image and calls callback with rendered canvas
 */
function getPosterImageAndDraw(callback) {
  const currentTheme = state.selectedPosterTheme || "red";
  const themeConfig = POSTER_THEMES[currentTheme] || POSTER_THEMES.red;
  const templateImg = document.getElementById("poster-template-bg");
  const expectedSrc = themeConfig.src;
  const expectedFilename = themeConfig.src.split("/").pop();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (templateImg && templateImg.complete && templateImg.naturalWidth > 0 && templateImg.src && templateImg.src.includes(expectedFilename)) {
    drawPosterCanvas(canvas, ctx, templateImg, currentTheme);
    callback(canvas);
  } else {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      drawPosterCanvas(canvas, ctx, img, currentTheme);
      callback(canvas);
    };
    img.onerror = () => {
      console.error("Failed to load poster template image:", expectedSrc);
      if (exportStatusMessage) {
        exportStatusMessage.textContent = "⚠️ Failed to load template image. Please try again.";
      }
    };
    img.src = expectedSrc;
  }
}

/**
 * Built-in Canvas Export: Renders 100% pixel-perfect text onto the exact template graphic
 */
function fallbackCanvasExport(format = "jpg", filename = "FreeFire_Leaderboard.jpg") {
  getPosterImageAndDraw((canvas) => {
    const mime = format === "png" ? "image/png" : "image/jpeg";
    triggerFileDownload(canvas.toDataURL(mime, 0.95), filename);
    if (exportStatusMessage) {
      exportStatusMessage.textContent = "✅ Results poster saved successfully!";
      setTimeout(() => {
        if (exportStatusMessage) exportStatusMessage.textContent = "";
      }, 5000);
    }
  });
}

/**
 * Open Team Breakdown Modal
 */
function openTeamBreakdownModal(teamName) {
  if (!teamModalBackdrop) return;

  const cumulativeStats = calculateCumulativeStats();
  const teamStat = cumulativeStats.find((t) => t.teamName === teamName);
  if (!teamStat) return;

  modalTeamName.textContent = teamStat.teamName.toUpperCase();
  modalTeamBreakdownContent.innerHTML = "";

  const savedMatchesCount = state.matches.filter((m) => m && m.isSaved).length;

  if (savedMatchesCount === 0) {
    modalTeamBreakdownContent.innerHTML = `
      <div style="text-align: center; color: #9ca3af; padding: 2rem 0;">
        No matches have been saved yet.<br>
        Enter and save match data in the <b>Match Data Input</b> tab to view breakdown.
      </div>
    `;
  } else {
    teamStat.matchBreakdown.forEach((mb) => {
      if (!mb.isPlayed) return;

      const item = document.createElement("div");
      item.className = "modal-match-item";
      item.innerHTML = `
        <div class="modal-match-num">
          MATCH ${mb.matchNumber}
          <button type="button" class="inline-edit-btn" data-match-index="${mb.matchNumber - 1}" title="Edit this match directly">✏️ EDIT</button>
        </div>
        <div class="modal-breakdown-details">
          <span>Rank: <b>#${mb.placement}</b> (${mb.placementPoints} pts)</span>
          <span>Kills: <b>${mb.kills}</b> (${mb.kills} pts)</span>
          ${mb.minus > 0 ? `<span>Minus: <b style="color:#ef4444;">-${mb.minus}</b> (-${mb.minus} pts)</span>` : ""}
        </div>
        <div class="modal-match-total">${mb.totalPoints} PTS</div>
      `;
      const editBtn = item.querySelector(".inline-edit-btn");
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          closeTeamBreakdownModal();
          selectMatch(mb.matchNumber - 1);
          switchSubView("view-match-input");
        });
      }
      modalTeamBreakdownContent.appendChild(item);
    });

    const footer = document.createElement("div");
    footer.className = "modal-summary-footer";
    footer.innerHTML = `
      <div>
        <div class="summary-stat-label">CUMULATIVE PLACEMENT PTS: <b>${teamStat.placementPoints}</b></div>
        <div class="summary-stat-label">CUMULATIVE ELIMINATION PTS: <b>${teamStat.eliminationPoints}</b></div>
        ${teamStat.minusPoints > 0 ? `<div class="summary-stat-label" style="color:#fca5a5;">CUMULATIVE PENALTY / MINUS: <b>-${teamStat.minusPoints}</b></div>` : ""}
        <div class="summary-stat-label">BOOYAHS WON: <b>${teamStat.booyahs}</b></div>
      </div>
      <div style="text-align: right;">
        <div class="summary-stat-label">CUMULATIVE TOTAL</div>
        <div class="summary-grand-total">${teamStat.totalPoints} PTS</div>
      </div>
    `;
    modalTeamBreakdownContent.appendChild(footer);
  }

  teamModalBackdrop.style.display = "flex";
}

function closeTeamBreakdownModal() {
  if (teamModalBackdrop) {
    teamModalBackdrop.style.display = "none";
  }
}

/**
 * Update filled teams counter in setup screen
 */
function updateFilledCount() {
  const inputs = teamsInputContainer.querySelectorAll(".team-name-input");
  let filled = 0;
  inputs.forEach((input) => {
    if (input.value.trim()) filled++;
  });
  teamsFilledCountEl.textContent = filled;
}

/**
 * Setup Error Display Helpers
 */
function showError(msg) {
  setupErrorMsg.textContent = msg;
  setupErrorMsg.classList.add("show");
}

function clearError() {
  setupErrorMsg.textContent = "";
  setupErrorMsg.classList.remove("show");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Reset Confirmation Modal Controls (Prompt 6)
 */
function openResetConfirmationModal() {
  if (!resetModalBackdrop) return;

  const savedCount = state.matches.filter((m) => m && m.isSaved).length;
  if (resetDialogTitle) resetDialogTitle.textContent = state.tournamentTitle.toUpperCase();
  if (resetDialogMatches) resetDialogMatches.textContent = state.totalMatches;
  if (resetDialogSavedCount) resetDialogSavedCount.textContent = `${savedCount} of ${state.totalMatches} matches recorded`;

  resetModalBackdrop.style.display = "flex";
}

function closeResetConfirmationModal() {
  if (resetModalBackdrop) {
    resetModalBackdrop.style.display = "none";
  }
}

function handleExecuteTournamentReset() {
  // 1. Clear from browser localStorage
  try {
    localStorage.removeItem("ff_tournament_calculator_state");
  } catch (err) {
    console.warn("Could not clear localStorage:", err);
  }

  // 2. Reset app state back to defaults
  state.tournamentTitle = "NZ PAID SCRIMS - BATTLE 01";
  state.totalMatches = 6;
  state.teams = [...DEFAULT_TEAMS];
  state.activeScreen = "setup";
  state.activeSubView = "view-match-input";
  state.selectedMatchIndex = 0;
  state.positionDisplayMode = "points";
  state.exportFormat = "jpg";
  state.matches = [];

  // 3. Re-initialize match structures & setup inputs
  initMatchesState();
  renderTeamInputs();
  updateFilledCount();

  if (tournamentNameInput) tournamentNameInput.value = state.tournamentTitle;
  if (totalMatchesInput) totalMatchesInput.value = state.totalMatches;

  matchChips.forEach((chip) => {
    if (parseInt(chip.dataset.matches, 10) === 6) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  // 4. Close dialog and return to setup screen
  closeResetConfirmationModal();
  showSetupScreen();

  // 5. User feedback notification
  showError("Tournament reset successfully. All previous match data cleared. Ready for a new scrim!");
  setTimeout(() => {
    clearError();
  }, 4500);
}

/**
 * Flash visual Auto-Save Indicator (Prompt 6)
 */
let autoSaveTimeout = null;
function flashAutoSaveIndicator() {
  if (!autosaveStatusPill || !autosaveText) return;

  autosaveStatusPill.classList.add("saving");
  autosaveText.textContent = "SAVED JUST NOW";

  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    if (autosaveStatusPill && autosaveText) {
      autosaveStatusPill.classList.remove("saving");
      autosaveText.textContent = "AUTO-SAVED TO BROWSER";
    }
  }, 1200);
}

/**
 * Local Storage Persistence (Prompt 6)
 * Automatically saves full tournament state to localStorage
 */
function saveState() {
  try {
    const dataToSave = {
      tournamentTitle: state.tournamentTitle,
      totalMatches: state.totalMatches,
      teams: state.teams,
      teamRosters: state.teamRosters || {},
      activeScreen: state.activeScreen,
      activeSubView: state.activeSubView,
      selectedMatchIndex: state.selectedMatchIndex,
      positionDisplayMode: state.positionDisplayMode,
      selectedPosterTheme: state.selectedPosterTheme || "red",
      exportFormat: state.exportFormat,
      matches: state.matches
    };

    localStorage.setItem("ff_tournament_calculator_state", JSON.stringify(dataToSave));
    flashAutoSaveIndicator();
  } catch (err) {
    console.warn("Could not save tournament state to localStorage:", err);
  }
}

/**
 * Load Saved State from Local Storage (Prompt 6)
 * Reloads active tournament state, team names, match count, and all saved scores
 */
function loadSavedState() {
  try {
    const saved = localStorage.getItem("ff_tournament_calculator_state");
    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.tournamentTitle) state.tournamentTitle = parsed.tournamentTitle;
      if (parsed.totalMatches) state.totalMatches = parseInt(parsed.totalMatches, 10) || 6;
      if (Array.isArray(parsed.teams) && parsed.teams.length > 0) state.teams = parsed.teams;
      if (parsed.teamRosters && typeof parsed.teamRosters === "object") state.teamRosters = parsed.teamRosters;
      if (parsed.activeScreen) state.activeScreen = parsed.activeScreen;
      if (parsed.activeSubView) state.activeSubView = parsed.activeSubView;
      if (parsed.selectedMatchIndex !== undefined) state.selectedMatchIndex = parsed.selectedMatchIndex;
      if (parsed.positionDisplayMode) state.positionDisplayMode = parsed.positionDisplayMode;
      if (parsed.selectedPosterTheme) state.selectedPosterTheme = parsed.selectedPosterTheme;
      if (parsed.exportFormat) state.exportFormat = parsed.exportFormat;
      if (Array.isArray(parsed.matches)) state.matches = parsed.matches;

      // Sync setup inputs
      if (tournamentNameInput) tournamentNameInput.value = state.tournamentTitle;
      if (totalMatchesInput) totalMatchesInput.value = state.totalMatches;

      matchChips.forEach((chip) => {
        if (parseInt(chip.dataset.matches, 10) === state.totalMatches) {
          chip.classList.add("active");
        } else {
          chip.classList.remove("active");
        }
      });
    }
  } catch (err) {
    console.warn("Could not load tournament state from localStorage:", err);
  }
}

/**
 * =====================================================================
 * GOOGLE INTEGRATION HANDLERS (Scenario A: Drive 5TB, Scenario B: Sheets)
 * =====================================================================
 */

const GOOGLE_OAUTH_CLIENT_ID = "312946951314-drprrom11es33e7d9pv3i2no4chfvijd.apps.googleusercontent.com";
const GOOGLE_DRIVE_FOLDER_ID = "1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5";
const GOOGLE_SPREADSHEET_ID = "1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4";
const GOOGLE_OAUTH_SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets";

let gisTokenClient = null;

/**
 * Token management in browser localStorage
 */
function getBrowserOAuthToken() {
  try {
    const raw = localStorage.getItem("ff_google_oauth_token");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.access_token) return null;
    if (data.expires_at && Date.now() > data.expires_at) {
      localStorage.removeItem("ff_google_oauth_token");
      return null;
    }
    return data.access_token;
  } catch (_) {
    return null;
  }
}

function saveBrowserOAuthToken(token, expiresIn = 3600) {
  try {
    const data = {
      access_token: token,
      expires_at: Date.now() + (expiresIn - 60) * 1000,
      saved_at: Date.now()
    };
    localStorage.setItem("ff_google_oauth_token", JSON.stringify(data));
  } catch (_) {}
}

function clearBrowserOAuthToken() {
  localStorage.removeItem("ff_google_oauth_token");
}

/**
 * Google Account Modal Controls
 */
function openGoogleAccountModal() {
  if (googleAccountModal) {
    googleAccountModal.style.display = "flex";
    checkOAuthStatusUI();
  }
}

function closeGoogleAccountModal() {
  if (googleAccountModal) {
    googleAccountModal.style.display = "none";
  }
}

function getOAuthRedirectUri() {
  if (window.location.origin.includes("localhost")) {
    return "http://localhost:3000/oauth2callback";
  }
  return "https://freefirecalc.netlify.app/oauth2callback";
}

function getGoogleOAuthUrl() {
  const redirectUri = getOAuthRedirectUri();
  return (
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    "client_id=" + encodeURIComponent(GOOGLE_OAUTH_CLIENT_ID) +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&response_type=token" +
    "&scope=" + encodeURIComponent(GOOGLE_OAUTH_SCOPES) +
    "&include_granted_scopes=true" +
    "&prompt=consent"
  );
}

/**
 * Check Google OAuth Connection Status
 */
async function checkOAuthStatusUI() {
  if (!oauthStatusBadge || !oauthStatusDesc) return;

  // 1. Check browser token first
  const browserToken = getBrowserOAuthToken();
  if (browserToken) {
    try {
      const res = await fetch("https://www.googleapis.com/drive/v3/about?fields=user,storageQuota", {
        headers: { Authorization: `Bearer ${browserToken}` }
      });
      if (res.ok) {
        const aboutData = await res.json();
        const userEmail = (aboutData.user && aboutData.user.emailAddress) || "Authorized User";
        let quotaText = "5 TB Quota";
        if (aboutData.storageQuota && aboutData.storageQuota.limit) {
          const limitGb = Math.round(aboutData.storageQuota.limit / (1024 * 1024 * 1024));
          const limitTb = (limitGb / 1024).toFixed(1);
          quotaText = limitTb >= 1 ? `${limitTb} TB Quota` : `${limitGb} GB Quota`;
        }

        oauthStatusBadge.style.background = "rgba(34, 197, 94, 0.25)";
        oauthStatusBadge.style.color = "#86efac";
        oauthStatusBadge.textContent = "CONNECTED (5 TB ACCOUNT)";
        oauthStatusDesc.innerHTML = `Connected as: <b style="color:#ffffff;">${escapeHtml(userEmail)}</b> (${quotaText}).<br><span style="color:#a7f3d0;">✓ Google Drive uploads will save directly into Folder: <code>${GOOGLE_DRIVE_FOLDER_ID}</code></span>`;
        if (btnOAuthSignIn) {
          btnOAuthSignIn.innerHTML = `<span class="btn-content"><span>🔄 RE-AUTHENTICATE / SWITCH ACCOUNT</span></span>`;
        }
        if (btnOAuthSignout) {
          btnOAuthSignout.style.display = "inline-flex";
        }
        return;
      } else if (res.status === 401) {
        clearBrowserOAuthToken();
      }
    } catch (_) {}
  }

  // 2. Check local server status if running
  try {
    const res = await fetch("/api/oauth/status");
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        oauthStatusBadge.style.background = "rgba(34, 197, 94, 0.25)";
        oauthStatusBadge.style.color = "#86efac";
        oauthStatusBadge.textContent = "CONNECTED (5 TB ACCOUNT)";
        const email = (data.user && data.user.emailAddress) || data.userEmail || "Google Account";
        oauthStatusDesc.innerHTML = `Connected as: <b style="color:#ffffff;">${escapeHtml(email)}</b>.<br><span style="color:#a7f3d0;">✓ Server connected to Google Drive using your account quota.</span>`;
        if (btnOAuthSignIn) {
          btnOAuthSignIn.innerHTML = `<span class="btn-content"><span>🔄 RE-AUTHENTICATE / SWITCH ACCOUNT</span></span>`;
        }
        if (btnOAuthSignout) {
          btnOAuthSignout.style.display = "inline-flex";
        }
        return;
      }
    }
  } catch (_) {}

  // 3. Not connected
  oauthStatusBadge.style.background = "rgba(239, 68, 68, 0.2)";
  oauthStatusBadge.style.color = "#fca5a5";
  oauthStatusBadge.textContent = "NOT CONNECTED";
  oauthStatusDesc.textContent = "Not authorized yet. Click below to sign in with your 5 TB Google account to enable Drive backups and poster uploads.";
  if (btnOAuthSignIn) {
    btnOAuthSignIn.innerHTML = `<span class="btn-content"><span>🚀 SIGN IN WITH GOOGLE (5 TB ACCOUNT)</span></span>`;
  }
  if (btnOAuthSignout) {
    btnOAuthSignout.style.display = "none";
  }
}

/**
 * Handle Sign In Click - Direct Full-Page Redirect to Google Login
 * Navigates directly to Google's official sign-in screen without popup blockage or origin errors!
 */
function handleOAuthSignInClick() {
  const url = getGoogleOAuthUrl();
  window.location.href = url;
}

/**
 * Alternative: Sign In in a Popup Window
 */
function handleOAuthSignInPopup() {
  const url = getGoogleOAuthUrl();
  const popup = window.open(url, "google_login_popup", "width=600,height=700");
  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    // Popup was blocked by browser, fallback to direct redirect
    window.location.href = url;
    return;
  }

  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (attempts > 30) clearInterval(poll);
    if (getBrowserOAuthToken()) {
      clearInterval(poll);
      checkOAuthStatusUI();
      try { popup.close(); } catch (_) {}
    }
  }, 2000);
}

/**
 * Disconnect / Sign Out Google Account
 */
function handleOAuthSignOut() {
  clearBrowserOAuthToken();
  checkOAuthStatusUI();
  alert("Signed out from Google Drive. You can reconnect anytime.");
}

/**
 * Handle OAuth Callback params from URL on load
 */
function handleOAuthCallbackFromUrl() {
  // Check for error in hash or query
  if (window.location.hash && window.location.hash.includes("error=")) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorMsg = hashParams.get("error_description") || hashParams.get("error");
    alert("⚠️ Google Authorization Notice: " + errorMsg);
    window.history.replaceState({}, document.title, window.location.pathname.replace(/\/oauth2callback\/?$/, "/") || "/");
    return;
  }
  if (window.location.search && window.location.search.includes("error=")) {
    const searchParams = new URLSearchParams(window.location.search);
    const errorMsg = searchParams.get("error_description") || searchParams.get("error");
    alert("⚠️ Google Authorization Notice: " + errorMsg);
    window.history.replaceState({}, document.title, window.location.pathname.replace(/\/oauth2callback\/?$/, "/") || "/");
    return;
  }

  // 1. Implicit OAuth token in URL hash (#access_token=...)
  if (window.location.hash && window.location.hash.includes("access_token=")) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const expiresIn = parseInt(hashParams.get("expires_in") || "3600", 10);
      if (accessToken) {
        saveBrowserOAuthToken(accessToken, expiresIn);
        const cleanPath = window.location.pathname.replace(/\/oauth2callback\/?$/, "/") || "/";
        window.history.replaceState({}, document.title, cleanPath);
        setTimeout(() => {
          checkOAuthStatusUI();
          alert("✅ Google Account (5 TB) successfully connected!\n\nBackups and Posters will now upload directly to your Drive.");
        }, 300);
        return;
      }
    } catch (e) {
      console.error("Error parsing OAuth hash token:", e);
    }
  }

  // 2. Query code in URL (?code=...)
  if (window.location.search && window.location.search.includes("code=")) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      fetch(`/oauth2callback?code=${encodeURIComponent(code)}`)
        .then(() => {
          const cleanPath = window.location.pathname.replace(/\/oauth2callback\/?$/, "/") || "/";
          window.history.replaceState({}, document.title, cleanPath);
          checkOAuthStatusUI();
        })
        .catch(() => {});
    }
  }
}

async function handleSaveOAuthCreds() {
  const clientId = inputOAuthClientId ? inputOAuthClientId.value.trim() : "";
  const clientSecret = inputOAuthClientSecret ? inputOAuthClientSecret.value.trim() : "";
  if (!clientId || !clientSecret) {
    alert("Please enter both Client ID and Client Secret.");
    return;
  }
  try {
    const res = await fetch("/api/oauth/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret })
    });
    const data = await res.json();
    if (data.success) {
      alert("✅ OAuth credentials configured! Now click 'SIGN IN WITH GOOGLE' to grant access.");
      checkOAuthStatusUI();
    } else {
      alert("⚠️ Failed: " + data.error);
    }
  } catch (err) {
    alert("⚠️ Error saving credentials: " + err.message);
  }
}

/**
 * Scenario B: Sync Match Scores to Google Spreadsheet
 * (Direct client-side Sheets API via OAuth token or backend server fallback)
 */
async function syncMatchScoresToGoogleSheets(matchNumber, teamData) {
  const teamsDataPayload = teamData.map((t, idx) => {
    const p = t.placement !== "" && t.placement !== undefined ? parseInt(t.placement, 10) : "";
    const k = parseInt(t.kills, 10) || 0;
    const m = parseInt(t.minus, 10) || 0;
    const score = calculateTeamMatchScore(p, k, m);
    const roster = (state.teamRosters && state.teamRosters[idx]) ? state.teamRosters[idx].filter(Boolean) : [];

    return {
      placement: p,
      teamName: t.teamName,
      players: roster,
      kills: score.killPoints,
      minus: score.minusPoints,
      placementPoints: score.placementPoints,
      totalPoints: score.totalPoints
    };
  });

  const now = new Date().toLocaleString();
  const rowsToAppend = teamsDataPayload.map((team) => [
    now,
    state.tournamentTitle || 'Free Fire Scrims',
    `Match ${matchNumber}`,
    team.placement !== undefined && team.placement !== '' ? Number(team.placement) : '-',
    team.teamName || 'Unknown Team',
    Array.isArray(team.players) ? team.players.filter(Boolean).join(', ') : (team.players || ''),
    Number(team.kills || 0),
    Number(team.placementPoints || 0),
    Number(team.totalPoints || 0)
  ]);

  // Method 1: Direct Client-Side Google Sheets Append via User's OAuth Token
  const browserToken = getBrowserOAuthToken();
  if (browserToken) {
    try {
      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      const sheetsRes = await fetch(sheetsUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${browserToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: rowsToAppend })
      });

      if (sheetsRes.ok) {
        console.log(`[Google Sheets] Match ${matchNumber} scores synced directly via OAuth.`);
        showMatchAlert(`✅ Match ${matchNumber} saved and synced to Google Sheets!`, "success");
        return { success: true };
      } else {
        const errJson = await sheetsRes.json().catch(() => ({}));
        console.warn("[Google Sheets Direct Sync Error]", errJson);
        if (sheetsRes.status === 401 || sheetsRes.status === 403) {
          clearBrowserOAuthToken();
          checkOAuthStatusUI();
          showMatchAlert(`⚠️ Match ${matchNumber} saved locally, but Google Sheets permission is needed. Click '👤 GOOGLE ACCOUNT' to connect and grant spreadsheet access.`, "error");
          return { success: false, error: "Authentication or scope error" };
        }
      }
    } catch (directErr) {
      console.warn("[Google Sheets Direct Sync Network Error]", directErr);
    }
  }

  // Method 2: Fallback to Backend Server Endpoint (Service Account)
  try {
    const response = await fetch("/api/record-match-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentTitle: state.tournamentTitle,
        matchNumber,
        teamsData: teamsDataPayload
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log(`[Google Sheets] Successfully recorded Match ${matchNumber} scores via server.`);
        showMatchAlert(`✅ Match ${matchNumber} saved and auto-synced to Google Sheets!`, "success");
        return data;
      }
    }
  } catch (err) {
    console.warn("[Google Sheets] Backend endpoint offline or unreachable:", err.message);
  }

  // If on static host and not signed in
  showMatchAlert(`⚠️ Match ${matchNumber} saved in browser! To auto-sync into your Google Sheet, click '👤 GOOGLE ACCOUNT' and Sign In.`, "error");
  return { success: false, message: "Scores saved in local browser. Connect Google Account to sync to Sheets." };
}

/**
 * Push all currently saved matches to Google Sheets in one click
 */
async function handleSyncAllMatchesToSheets() {
  const savedMatches = state.matches.filter(m => m && m.isSaved);
  if (savedMatches.length === 0) {
    alert("⚠️ No saved match data found yet. Please enter match scores and click 'SAVE MATCH DATA' first.");
    return;
  }

  const token = getBrowserOAuthToken();
  if (!token) {
    openGoogleAccountModal();
    alert("⚠️ Please connect your Google Account first. Click '🚀 SIGN IN WITH GOOGLE' to grant spreadsheet sync permissions.");
    return;
  }

  const btn = btnSyncSheets || btnModalSyncSheets;
  const origText = btn ? btn.innerHTML : "";
  if (btn) btn.innerHTML = `<span>⏳ SYNCING...</span>`;

  try {
    let syncedMatchesCount = 0;
    for (const match of savedMatches) {
      const res = await syncMatchScoresToGoogleSheets(match.matchNumber, match.teamData);
      if (res && res.success) {
        syncedMatchesCount++;
      }
    }

    if (syncedMatchesCount > 0) {
      alert(`✅ Google Sheets Sync Completed!\n\nSynced ${syncedMatchesCount} match(es) (${syncedMatchesCount * 12} rows) into your spreadsheet:\nBackend 2 (1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4)`);
    } else {
      alert(`⚠️ Could not sync to Google Sheets. Please ensure your Google account is connected with spreadsheet permissions by clicking '👤 GOOGLE ACCOUNT'.`);
    }
  } catch (err) {
    alert(`⚠️ Error syncing to Google Sheets: ${err.message}`);
  } finally {
    if (btn) btn.innerHTML = origText;
  }
}

/**
 * Unified Google Drive Upload Function (Scenario A)
 * Directly uploads to Google Drive Folder: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5
 * Uses user's 5 TB quota via OAuth 2.0 Web Token in browser, or server backend.
 */
async function uploadFileToDrive({ filename, mimeType, base64Data, description }) {
  const browserToken = getBrowserOAuthToken();

  // 1. Direct Web Upload if browser token is present (Fast, works on Netlify & localhost)
  if (browserToken) {
    const boundary = "-------ff_drive_boundary_" + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      description: description || "Free Fire Scrims Tournament File"
    };

    const rawBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      rawBase64 +
      closeDelimiter;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${browserToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, ...data, method: "direct_oauth_web" };
    }

    if (res.status === 401) {
      clearBrowserOAuthToken();
      checkOAuthStatusUI();
      throw new Error("Your Google sign-in session expired. Please click 'GOOGLE ACCOUNT' and sign in again.");
    }

    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error ? errJson.error.message : `Drive upload failed with HTTP status ${res.status}`);
  }

  // 2. Try server-side upload endpoint
  try {
    const serverRes = await fetch("/api/upload-drive-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, mimeType, base64Data, description })
    });
    if (serverRes.ok) {
      const sData = await serverRes.json();
      if (sData.success) return sData;
    }
  } catch (_) {}

  // If not signed in yet, open the modal and alert the user
  openGoogleAccountModal();
  throw new Error("Google Account not connected yet. Please click 'SIGN IN WITH GOOGLE' to authorize uploads to your 5 TB Drive.");
}

/**
 * Scenario A: Upload Tournament Backup JSON to Google Drive
 */
async function handleCloudDriveBackup() {
  if (!btnCloudBackup) return;

  const originalHtml = btnCloudBackup.innerHTML;
  btnCloudBackup.innerHTML = `<span>⏳ UPLOADING...</span>`;

  try {
    const backupData = {
      tournamentTitle: state.tournamentTitle,
      totalMatches: state.totalMatches,
      teams: state.teams,
      teamRosters: state.teamRosters,
      matches: state.matches,
      savedAt: new Date().toISOString()
    };

    const filename = `${(state.tournamentTitle || "Tournament").replace(/[^a-zA-Z0-9_-]/g, "_")}_Backup_${Date.now()}.json`;
    const base64Data = "data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(backupData, null, 2))));

    const result = await uploadFileToDrive({
      filename,
      mimeType: "application/json",
      base64Data,
      description: `Free Fire Scrims Tournament backup for ${state.tournamentTitle}`
    });

    if (result.success) {
      alert(`✅ Cloud Backup Saved to Google Drive!\n\nFile: ${filename}\nGoogle Drive Folder ID: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5\nMethod: 5 TB Account OAuth Upload`);
    } else {
      alert(`⚠️ Could not save to Google Drive: ${result.error || "Unknown error"}`);
    }
  } catch (err) {
    alert(`⚠️ Google Drive upload error: ${err.message}`);
  } finally {
    btnCloudBackup.innerHTML = originalHtml;
  }
}

/**
 * Scenario A: Export Leaderboard Poster Image directly to Google Drive
 */
async function handleCloudDrivePosterExport(format = "jpg") {
  if (exportStatusMessage) {
    exportStatusMessage.textContent = "⏳ Generating poster image and uploading to Google Drive...";
  }

  getPosterImageAndDraw(async (canvas) => {
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const dataUrl = canvas.toDataURL(mime, 0.95);
    const safeTitle = (state.tournamentTitle || "Tournament").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `FreeFire_${safeTitle}_Leaderboard_${Date.now()}.${format}`;

    try {
      const result = await uploadFileToDrive({
        filename,
        mimeType: mime,
        base64Data: dataUrl,
        description: `Exported Leaderboard Poster for ${state.tournamentTitle}`
      });

      if (result.success) {
        if (exportStatusMessage) {
          exportStatusMessage.textContent = `✅ Saved to Google Drive! (${filename})`;
        }
        alert(`✅ Poster Saved to Google Drive!\n\nFile: ${filename}\nFolder ID: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5\nMethod: 5 TB Account Upload`);
      } else {
        if (exportStatusMessage) exportStatusMessage.textContent = `⚠️ Drive error: ${result.error}`;
        alert(`⚠️ Drive error: ${result.error}`);
      }
    } catch (err) {
      if (exportStatusMessage) exportStatusMessage.textContent = `⚠️ Drive error: ${err.message}`;
      alert(`⚠️ Could not upload poster to Google Drive: ${err.message}`);
    }
  });
}

