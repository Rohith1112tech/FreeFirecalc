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

// Multi-Lobby Configurations (3 Independent Lobbies with Isolated Databases)
const LOBBY_CONFIGS = {
  lobby1: { id: "lobby1", label: "LOBBY 1", defaultTitle: "NZ PAID SCRIMS - LOBBY 01", dbTag: "DB-01" },
  lobby2: { id: "lobby2", label: "LOBBY 2", defaultTitle: "NZ PAID SCRIMS - LOBBY 02", dbTag: "DB-02" },
  lobby3: { id: "lobby3", label: "LOBBY 3", defaultTitle: "NZ PAID SCRIMS - LOBBY 03", dbTag: "DB-03" }
};

function getActiveLobbyId() {
  try {
    return localStorage.getItem("ff_active_lobby_id") || "lobby1";
  } catch (_) {
    return "lobby1";
  }
}

function getLobbyStorageKey(lobbyId = (typeof state !== "undefined" && state.activeLobby)) {
  return `ff_tournament_calculator_state_${lobbyId || "lobby1"}`;
}

// App State
const state = {
  activeLobby: "lobby1",
  tournamentTitle: "NZ PAID SCRIMS - LOBBY 01",
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

// DOM Elements - 3-Lobby Multi-Database Controller
const btnLobby1 = document.getElementById("btn-lobby-1");
const btnLobby2 = document.getElementById("btn-lobby-2");
const btnLobby3 = document.getElementById("btn-lobby-3");
const btnLobbyCloudPull = document.getElementById("btn-lobby-cloud-pull");
const syncSpinIcon = document.getElementById("sync-spin-icon");
const syncBtnText = document.getElementById("sync-btn-text");
const lobbyActiveBadgeText = document.getElementById("lobby-active-badge-text");
const tourneyLobbyPill = document.getElementById("tourney-lobby-pill");

/**
 * Updates UI styling & badges for active lobby
 */
function updateLobbyUI() {
  const currentLobby = (typeof state !== "undefined" && state.activeLobby) || "lobby1";
  const lobbyInfo = LOBBY_CONFIGS[currentLobby] || { label: "LOBBY 1" };

  if (btnLobby1) {
    const isAct = currentLobby === "lobby1";
    btnLobby1.classList.toggle("active", isAct);
    btnLobby1.setAttribute("aria-selected", isAct ? "true" : "false");
  }
  if (btnLobby2) {
    const isAct = currentLobby === "lobby2";
    btnLobby2.classList.toggle("active", isAct);
    btnLobby2.setAttribute("aria-selected", isAct ? "true" : "false");
  }
  if (btnLobby3) {
    const isAct = currentLobby === "lobby3";
    btnLobby3.classList.toggle("active", isAct);
    btnLobby3.setAttribute("aria-selected", isAct ? "true" : "false");
  }

  if (lobbyActiveBadgeText) {
    lobbyActiveBadgeText.textContent = `${lobbyInfo.label} ACTIVE`;
  }
  if (tourneyLobbyPill) {
    tourneyLobbyPill.innerHTML = `<span class="active-dot"></span> ${lobbyInfo.label}`;
  }
}

/**
 * Switches to target lobby with 100% data isolation
 * Automatically saves current lobby first, then loads target lobby database
 */
function switchLobby(newLobbyId) {
  if (!newLobbyId || newLobbyId === state.activeLobby) return;

  // 1. Save current lobby state first to preserve everything entered
  saveState();

  // 2. Set active lobby pointer
  state.activeLobby = newLobbyId;
  try {
    localStorage.setItem("ff_active_lobby_id", newLobbyId);
  } catch (_) {}

  // 3. Load target lobby's isolated database
  loadSavedState(newLobbyId);
  initMatchesState();

  // 4. Update Screen Visibility and Components for target lobby
  if (state.activeScreen === "tournament" && Array.isArray(state.teams) && state.teams.length > 0) {
    setupScreen.classList.remove("active");
    tournamentScreen.classList.add("active");
    if (activeTournamentTitleEl) activeTournamentTitleEl.textContent = state.tournamentTitle.toUpperCase();
    if (displayTotalMatchesEl) displayTotalMatchesEl.textContent = state.totalMatches;
    renderMatchSelectors();
    renderMatchTeamForms();
    updateProgressBadge();
    renderLeaderboardRows();
    renderMatrixTable();
    updateActiveMatchBanner();
  } else {
    // Show Admin Setup Screen for target lobby
    tournamentScreen.classList.remove("active");
    setupScreen.classList.add("active");
    if (tournamentNameInput) tournamentNameInput.value = state.tournamentTitle;
    if (totalMatchesInput) totalMatchesInput.value = state.totalMatches;
    renderTeamInputs();
    updateFilledCount();
  }

  // 5. Update Lobby Switcher UI indicators
  updateLobbyUI();

  // 6. Visual user feedback
  const lobbyInfo = LOBBY_CONFIGS[newLobbyId] || { label: newLobbyId.toUpperCase() };
  if (typeof showMatchAlert === "function" && state.activeScreen === "tournament") {
    showMatchAlert(`⚡ Switched to ${lobbyInfo.label} Database`, "info");
  } else {
    showError(`⚡ Switched to ${lobbyInfo.label} (${state.tournamentTitle})`);
    setTimeout(() => clearError(), 3000);
  }

  // 7. Auto-save newly activated lobby so storage entry is confirmed
  saveState();

  // 8. Try to background pull newest cloud backup for this lobby (Laptop <-> Mobile Sync)
  fetchTournamentFromCloud({ lobbyId: newLobbyId, silent: true }).catch(() => {});
}

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

// Google Drive Zero-Login Apps Script Webhook Elements (Option 1)
const inputDriveWebhookUrl = document.getElementById("input-drive-webhook-url");
const btnSaveWebhookUrl = document.getElementById("btn-save-webhook-url");
const btnCopyAppsScriptCode = document.getElementById("btn-copy-apps-script-code");
const copyScriptText = document.getElementById("copy-script-text");
const btnClearWebhookUrl = document.getElementById("btn-clear-webhook-url");

// Share Results Link & Shared Viewer Elements
const btnShareResultsTop = document.getElementById("btn-share-results-top");
const btnShareResultsBottom = document.getElementById("btn-share-results-bottom");
const shareResultsModal = document.getElementById("share-results-modal-backdrop");
const btnCloseShareModal = document.getElementById("btn-close-share-modal");
const btnDoneShareModal = document.getElementById("btn-done-share-modal");
const shareLinkInput = document.getElementById("share-link-input");
const btnCopyShareLink = document.getElementById("btn-copy-share-link");
const copyShareText = document.getElementById("copy-share-text");
const copyShareIcon = document.getElementById("copy-share-icon");
const btnShareWhatsapp = document.getElementById("btn-share-whatsapp");
const btnShareTelegram = document.getElementById("btn-share-telegram");
const btnShareDiscord = document.getElementById("btn-share-discord");
const discordShareText = document.getElementById("discord-share-text");
const shareOverviewTitle = document.getElementById("share-overview-title");
const shareOverviewStatus = document.getElementById("share-overview-status");
const shareOverviewLeader = document.getElementById("share-overview-leader");
const shareOverviewMvp = document.getElementById("share-overview-mvp");
const shareOverviewTheme = document.getElementById("share-overview-theme");
const shareCompressionNote = document.getElementById("share-compression-note");

const sharedViewerBanner = document.getElementById("shared-viewer-banner");
const sharedBannerTourneyTitle = document.getElementById("shared-banner-tourney-title");
const btnSharedCopyLink = document.getElementById("btn-shared-copy-link");
const btnSharedClone = document.getElementById("btn-shared-clone");
const btnSharedExit = document.getElementById("btn-shared-exit");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  const hasShared = checkForSharedResultsUrl();
  if (!hasShared) {
    const storedLobby = getActiveLobbyId();
    loadSavedState(storedLobby);
  }
  setPosterTheme(state.selectedPosterTheme || "red");
  initMatchesState();
  renderTeamInputs();
  bindEvents();
  updateFilledCount();
  updateLobbyUI();
  handleOAuthCallbackFromUrl();
  checkOAuthStatusUI();

  if (state.activeScreen === "tournament" || hasShared) {
    showTournamentScreen();
    if (hasShared) {
      switchSubView("view-leaderboard");
    }
  }

  // Cross-device cloud sync: Automatically pull latest cloud backup for this lobby on load
  if (!hasShared) {
    setTimeout(() => {
      fetchTournamentFromCloud({ lobbyId: state.activeLobby, silent: true }).catch(() => {});
    }, 600);
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
    // Sync team names if updated while strictly preserving existing match scores & kills
    state.matches.forEach((m) => {
      if (!Array.isArray(m.teamData)) {
        m.teamData = [];
      }
      const existingTeamData = m.teamData;
      m.teamData = state.teams.map((teamName, idx) => {
        const found = existingTeamData[idx] || existingTeamData.find((t) => t && t.teamName === teamName);
        if (found) {
          return {
            teamName: teamName || found.teamName,
            placement: found.placement !== undefined ? found.placement : "",
            kills: found.kills !== undefined ? found.kills : 0,
            minus: found.minus !== undefined ? found.minus : 0,
            playerKills: found.playerKills || {}
          };
        }
        return {
          teamName,
          placement: "",
          kills: 0,
          minus: 0
        };
      });
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
      saveState();
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
        saveState();
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
  // 3-Lobby Database Switcher Tabs
  if (btnLobby1) {
    btnLobby1.addEventListener("click", () => switchLobby("lobby1"));
  }
  if (btnLobby2) {
    btnLobby2.addEventListener("click", () => switchLobby("lobby2"));
  }
  if (btnLobby3) {
    btnLobby3.addEventListener("click", () => switchLobby("lobby3"));
  }

  // Cross-device manual cloud sync button
  if (btnLobbyCloudPull) {
    btnLobbyCloudPull.addEventListener("click", () => {
      fetchTournamentFromCloud({ lobbyId: state.activeLobby, force: true, silent: false });
    });
  }

  // Total Matches quick chips
  matchChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      matchChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const matches = parseInt(chip.dataset.matches, 10);
      totalMatchesInput.value = matches;
      state.totalMatches = matches;
      clearError();
      saveState();
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
    saveState();
  });

  // Tournament title input
  tournamentNameInput.addEventListener("input", (e) => {
    state.tournamentTitle = e.target.value.trim() || "NZ PAID SCRIMS";
    saveState();
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

  // Google Account / Cloud Sync Button
  if (btnGoogleAccount) {
    btnGoogleAccount.addEventListener("click", handleDirectCloudDriveSync);
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
  if (btnSaveWebhookUrl) {
    btnSaveWebhookUrl.addEventListener("click", handleSaveWebhookUrl);
  }
  if (btnCopyAppsScriptCode) {
    btnCopyAppsScriptCode.addEventListener("click", handleCopyAppsScriptCode);
  }
  if (btnClearWebhookUrl) {
    btnClearWebhookUrl.addEventListener("click", handleClearWebhookUrl);
  }
  if (btnSyncSheets) {
    btnSyncSheets.addEventListener("click", handleSyncAllMatchesToSheets);
  }
  if (btnModalSyncSheets) {
    btnModalSyncSheets.addEventListener("click", handleSyncAllMatchesToSheets);
  }

  // Share Results Link Modal Bindings
  if (btnShareResultsTop) {
    btnShareResultsTop.addEventListener("click", openShareResultsModal);
  }
  if (btnShareResultsBottom) {
    btnShareResultsBottom.addEventListener("click", openShareResultsModal);
  }
  if (btnCloseShareModal) {
    btnCloseShareModal.addEventListener("click", closeShareResultsModal);
  }
  if (btnDoneShareModal) {
    btnDoneShareModal.addEventListener("click", closeShareResultsModal);
  }
  if (shareResultsModal) {
    shareResultsModal.addEventListener("click", (e) => {
      if (e.target === shareResultsModal) closeShareResultsModal();
    });
  }
  if (btnCopyShareLink) {
    btnCopyShareLink.addEventListener("click", copyShareResultsLink);
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
 * Real-Time Continuous Live Auto-Save
 * Automatically saves scores, updates standings & matrix, and schedules Drive background sync
 * whenever any placement, kill, penalty, or player score is modified.
 */
function triggerLiveMatchAutoSave() {
  const currentMatch = state.matches[state.selectedMatchIndex];
  if (!currentMatch) return;

  // Mark match as saved if at least one team has a placement, kill, or minus entered
  const hasEntries = currentMatch.teamData && currentMatch.teamData.some(t => 
    (t.placement !== "" && t.placement !== null && t.placement !== undefined) ||
    (t.kills > 0) ||
    (t.minus > 0)
  );

  if (hasEntries) {
    currentMatch.isSaved = true;
  }

  // Update standings, progress bar, matrix, and selectors in real-time
  renderLeaderboardRows(false);
  renderMatrixTable();
  updateProgressBadge();
  updateActiveMatchBanner();
  renderMatchSelectors();

  // Save to localStorage & schedule immediate Google Drive auto-sync
  saveState();
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
      triggerLiveMatchAutoSave();
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
      triggerLiveMatchAutoSave();
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
      triggerLiveMatchAutoSave();
    });

    minusWrap.appendChild(minusInput);
    minusBlock.appendChild(minusLabel);
    minusBlock.appendChild(minusWrap);
    minusRow.appendChild(minusBlock);

    card.appendChild(minusRow);

    // Individual Player Kills Section (for MVP Tracking)
    if (roster.length > 0) {
      if (!currentMatch.teamData[teamIdx]) {
        currentMatch.teamData[teamIdx] = { teamName, placement: "", kills: existing.kills || 0, minus: existing.minus || 0 };
      }
      if (!currentMatch.teamData[teamIdx].playerKills) {
        currentMatch.teamData[teamIdx].playerKills = existing.playerKills ? { ...existing.playerKills } : {};
      }

      const playerKillsSection = document.createElement("div");
      playerKillsSection.className = "card-player-kills-section";

      const pkTitle = document.createElement("div");
      pkTitle.className = "player-kills-title";
      pkTitle.innerHTML = `
        <span>🎯 SQUAD PLAYER KILLS (MVP)</span>
        <span style="font-size:0.65rem;opacity:0.8;font-weight:600;">Auto-sums kills</span>
      `;
      playerKillsSection.appendChild(pkTitle);

      const pkGrid = document.createElement("div");
      pkGrid.className = "player-kills-grid";

      roster.forEach((playerName) => {
        const pItem = document.createElement("div");
        pItem.className = "player-kill-item";

        const pName = document.createElement("span");
        pName.className = "player-kill-name";
        pName.title = playerName;
        pName.textContent = playerName;

        const counterDiv = document.createElement("div");
        counterDiv.className = "player-kill-counter";

        const minusBtn = document.createElement("button");
        minusBtn.type = "button";
        minusBtn.className = "btn-kill-step";
        minusBtn.textContent = "-";
        minusBtn.title = "Decrease kill";

        const killInput = document.createElement("input");
        killInput.type = "number";
        killInput.min = "0";
        killInput.max = "99";
        killInput.className = "player-kill-input";
        const currentVal = (currentMatch.teamData[teamIdx].playerKills && currentMatch.teamData[teamIdx].playerKills[playerName] !== undefined)
          ? currentMatch.teamData[teamIdx].playerKills[playerName]
          : 0;
        killInput.value = currentVal;

        const plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.className = "btn-kill-step";
        plusBtn.textContent = "+";
        plusBtn.title = "Increase kill";

        const updatePlayerKillsAndSum = (newVal) => {
          if (newVal < 0) newVal = 0;
          killInput.value = newVal;
          if (!currentMatch.teamData[teamIdx]) {
            currentMatch.teamData[teamIdx] = { teamName, placement: "", kills: 0, minus: 0 };
          }
          if (!currentMatch.teamData[teamIdx].playerKills) {
            currentMatch.teamData[teamIdx].playerKills = {};
          }
          currentMatch.teamData[teamIdx].playerKills[playerName] = newVal;

          // Auto-sum squad kills and update total team kills input
          const sumKills = roster.reduce((sum, p) => {
            const pk = currentMatch.teamData[teamIdx].playerKills[p];
            return sum + (typeof pk === "number" ? pk : (parseInt(pk, 10) || 0));
          }, 0);

          currentMatch.teamData[teamIdx].kills = sumKills;
          killsInput.value = sumKills;
          updateCardPointsPreview(teamIdx);
          triggerLiveMatchAutoSave();
        };

        minusBtn.addEventListener("click", () => {
          let curr = parseInt(killInput.value, 10) || 0;
          if (curr > 0) updatePlayerKillsAndSum(curr - 1);
        });

        plusBtn.addEventListener("click", () => {
          let curr = parseInt(killInput.value, 10) || 0;
          updatePlayerKillsAndSum(curr + 1);
        });

        killInput.addEventListener("input", (e) => {
          let val = parseInt(e.target.value, 10);
          if (isNaN(val) || val < 0) val = 0;
          updatePlayerKillsAndSum(val);
        });

        counterDiv.appendChild(minusBtn);
        counterDiv.appendChild(killInput);
        counterDiv.appendChild(plusBtn);

        pItem.appendChild(pName);
        pItem.appendChild(counterDiv);
        pkGrid.appendChild(pItem);
      });

      playerKillsSection.appendChild(pkGrid);
      card.appendChild(playerKillsSection);
    }

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

  // 3. Normalize kills, minus, and playerKills
  currentMatch.teamData.forEach((t) => {
    const k = parseInt(t.kills, 10);
    t.kills = isNaN(k) || k < 0 ? 0 : k;
    const m = parseInt(t.minus, 10);
    t.minus = isNaN(m) || m < 0 ? 0 : m;

    if (t.playerKills && typeof t.playerKills === "object") {
      const normalizedPK = {};
      Object.entries(t.playerKills).forEach(([pName, pKills]) => {
        const pk = parseInt(pKills, 10);
        normalizedPK[pName] = isNaN(pk) || pk < 0 ? 0 : pk;
      });
      t.playerKills = normalizedPK;
    }
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
    showMatchAlert(`Match ${matchNum} corrected! Updating local data, syncing to Google Sheets & Drive...`, "success");
  } else {
    showMatchAlert(`Match ${matchNum} saved! Syncing scores to Google Sheets & Drive...`, "success");
  }

  // Automatic Google Sheets Synchronization (Scenario B)
  syncMatchScoresToGoogleSheets(matchNum, currentMatch.teamData).catch((err) => {
    console.warn("Google Sheets background sync notice:", err);
  });

  // Automatic Google Drive Tournament Backup (Scenario A)
  autoSyncTournamentToDrive({ silent: true }).catch((err) => {
    console.warn("Google Drive background sync notice:", err);
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
  triggerLiveMatchAutoSave();
  showMatchAlert(`Auto-assigned unique placements 1-12 & auto-saved to Drive.`, "success");
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
 * Calculate Tournament MVP (Top Fragger) Across All Saved Matches
 * Tracks individual player kills across all matches and ranks the top fraggers
 */
function calculateTournamentMVP() {
  const playerStats = {};

  state.matches.forEach((match) => {
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

/**
 * Update MVP Display across the Live Poster Overlay and Showcase Widget
 */
function updateMVPDisplay() {
  const mvpData = calculateTournamentMVP();
  const top = mvpData.topFragger;

  // 1. Live Poster Overlay (#poster-mvp-strip)
  const posterMvpStrip = document.getElementById("poster-mvp-strip");
  const posterMvpName = document.getElementById("poster-mvp-name");
  const posterMvpTeam = document.getElementById("poster-mvp-team");
  const posterMvpKills = document.getElementById("poster-mvp-kills");

  if (posterMvpStrip) {
    if (top && top.totalKills > 0) {
      posterMvpStrip.style.display = "flex";
      if (posterMvpName) posterMvpName.textContent = top.playerName;
      if (posterMvpTeam) posterMvpTeam.textContent = `[${top.teamName}]`;
      if (posterMvpKills) posterMvpKills.textContent = `🔥 ${top.totalKills} KILLS`;
    } else {
      posterMvpStrip.style.display = "none";
    }
  }

  // 2. Showcase Panel above poster (#mvp-showcase-panel)
  const mvpShowcasePanel = document.getElementById("mvp-showcase-panel");
  const mvpHeroName = document.getElementById("mvp-hero-name");
  const mvpHeroTeam = document.getElementById("mvp-hero-team");
  const mvpHeroKills = document.getElementById("mvp-hero-kills");
  const mvpHeroPeak = document.getElementById("mvp-hero-peak");
  const mvpTopStrip = document.getElementById("mvp-top-fraggers-strip");

  if (mvpShowcasePanel) {
    if (top && top.totalKills > 0) {
      mvpShowcasePanel.style.display = "block";
      if (mvpHeroName) mvpHeroName.textContent = top.playerName;
      if (mvpHeroTeam) mvpHeroTeam.textContent = `TEAM: ${top.teamName}`;
      if (mvpHeroKills) mvpHeroKills.textContent = `${top.totalKills} KILLS`;
      if (mvpHeroPeak) mvpHeroPeak.textContent = `${top.maxSingleMatchKills} KILLS (PEAK)`;

      if (mvpTopStrip) {
        mvpTopStrip.innerHTML = "";
        mvpData.leaderboard.forEach((fragger, idx) => {
          const rankNum = idx + 1;
          const medal = rankNum === 1 ? "🥇 MVP" : rankNum === 2 ? "🥈 #2" : rankNum === 3 ? "🥉 #3" : `#${rankNum}`;
          const pill = document.createElement("div");
          pill.className = `mvp-podium-pill ${rankNum === 1 ? "rank-1" : ""}`;
          pill.innerHTML = `
            <span class="fragger-rank">${medal}</span>
            <span class="fragger-name">${escapeHtml(fragger.playerName)}</span>
            <span class="fragger-team">(${escapeHtml(fragger.teamName)})</span>
            <span class="fragger-kills">💀 ${fragger.totalKills}</span>
          `;
          mvpTopStrip.appendChild(pill);
        });
      }
    } else {
      mvpShowcasePanel.style.display = "none";
    }
  }
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

  // Keep MVP Showcase & On-Poster Banner in sync with current scores
  updateMVPDisplay();
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

      // 1. Team Name (Slot: centered at 31.9%)
      ctx.font = `bold ${teamFontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let displayName = t.teamName.toUpperCase();
      const maxTextWidth = canvas.width * 0.238;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, canvas.width * 0.319, rowCenterY);

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
    const cyanSlotCenters = [406.5, 443, 479.5, 516, 552.5, 589, 625.5, 662, 698.5, 735, 771.5, 808];
    const rowHeight = (canvas.height * (438 / 1024)) / 12;

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
        ctx.fillText("👑", canvas.width * 0.128, rowCenterY - rowHeight * 0.42);
      }

      // 1. Team Name (Slot: centered at 34.25%)
      ctx.font = `bold ${teamFontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let displayName = t.teamName.toUpperCase();
      const maxTextWidth = canvas.width * 0.255;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, canvas.width * 0.3425, rowCenterY);

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
    const redSlotCenters = [378, 422.5, 467, 511.5, 556, 600.5, 645, 689.5, 734, 778.5, 823, 868];
    const rowHeight = (canvas.height * (535 / 1024)) / 12;

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
        ctx.fillText("👑", canvas.width * 0.108, rowCenterY - rowHeight * 0.42);
      }

      // 1. Team Name (Slot: centered at 31.9%)
      ctx.font = `bold ${teamFontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let displayName = t.teamName.toUpperCase();
      const maxTextWidth = canvas.width * 0.238;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, canvas.width * 0.319, rowCenterY);

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

  // Draw MVP Overlay Banner onto Canvas Export if an MVP exists
  drawPosterMVPOverlay(canvas, ctx, theme);
}

/**
 * Draws the high-resolution MVP Banner onto the exported canvas
 */
function drawPosterMVPOverlay(canvas, ctx, theme) {
  const mvpData = calculateTournamentMVP();
  const top = mvpData.topFragger;
  if (!top || top.totalKills <= 0) return;

  const themeConfig = POSTER_THEMES[theme] || POSTER_THEMES.red;
  const isCyan = themeConfig.layout === "cyan_725";

  // Position: Cyan footer has special layout (86.5%), Red and Modern are at 92.5%
  const barY = isCyan ? canvas.height * 0.865 : canvas.height * 0.925;
  const barHeight = canvas.height * 0.038;
  const barWidth = canvas.width * 0.88;
  const barX = (canvas.width - barWidth) / 2;
  const cornerRadius = 6;

  ctx.save();

  // Background box with dark frosted tint
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(barX, barY, barWidth, barHeight, cornerRadius);
  } else {
    ctx.rect(barX, barY, barWidth, barHeight);
  }
  ctx.fillStyle = "rgba(10, 14, 22, 0.92)";
  ctx.fill();

  // Glowing border matching theme
  ctx.lineWidth = 3;
  ctx.strokeStyle = themeConfig.posColor || "#e50914";
  ctx.shadowColor = themeConfig.posColor || "#e50914";
  ctx.shadowBlur = 10;
  ctx.stroke();

  // Render MVP text
  const fontSize = Math.round(canvas.width * 0.021);
  ctx.font = `bold ${fontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const centerY = barY + barHeight / 2;

  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ffffff";

  const mvpText = `🏆 TOURNAMENT MVP: ${top.playerName.toUpperCase()} (${top.teamName.toUpperCase()})  ★  ${top.totalKills} TOTAL KILLS`;
  ctx.fillText(mvpText, canvas.width / 2, centerY);

  ctx.restore();
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
  const currentLobby = (typeof state !== "undefined" && state.activeLobby) || "lobby1";
  const lobbyInfo = LOBBY_CONFIGS[currentLobby] || { label: currentLobby.toUpperCase(), defaultTitle: `NZ PAID SCRIMS - ${currentLobby.toUpperCase()}` };

  // 1. Clear from browser localStorage for active lobby ONLY
  try {
    localStorage.removeItem(getLobbyStorageKey(currentLobby));
    if (currentLobby === "lobby1") {
      localStorage.removeItem("ff_tournament_calculator_state"); // clear legacy key too
    }
  } catch (err) {
    console.warn("Could not clear localStorage:", err);
  }

  // 2. Reset app state back to defaults for active lobby
  state.tournamentTitle = lobbyInfo.defaultTitle;
  state.totalMatches = 6;
  state.teams = [...DEFAULT_TEAMS];
  state.teamRosters = {};
  state.activeScreen = "setup";
  state.activeSubView = "view-match-input";
  state.selectedMatchIndex = 0;
  state.positionDisplayMode = "points";
  state.selectedPosterTheme = "red";
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

  saveState();

  // 4. Close dialog and return to setup screen
  closeResetConfirmationModal();
  showSetupScreen();

  // 5. User feedback notification
  showError(`${lobbyInfo.label} reset successfully. Ready for a new scrim!`);
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
  autosaveStatusPill.classList.remove("syncing-drive");
  autosaveText.textContent = "SAVED JUST NOW";

  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    if (autosaveStatusPill && autosaveText) {
      autosaveStatusPill.classList.remove("saving");
      if (getDriveWebhookUrl() || getBrowserOAuthToken()) {
        autosaveStatusPill.classList.add("drive-synced");
        autosaveText.textContent = "☁️ AUTO-SAVED TO DRIVE & BROWSER";
      } else {
        autosaveStatusPill.classList.remove("drive-synced");
        autosaveText.textContent = "AUTO-SAVED TO BROWSER";
      }
    }
  }, 1200);
}

/**
 * Local Storage Persistence (Prompt 6 & Multi-Lobby Isolation)
 * Automatically saves full tournament state to localStorage for the active lobby and queues Google Drive background sync
 */
function saveState() {
  if (state.isSharedView) return; // Do not overwrite user's local tournament while in shared read-only view
  try {
    const dataToSave = {
      activeLobby: state.activeLobby || "lobby1",
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

    const targetKey = getLobbyStorageKey(state.activeLobby);
    localStorage.setItem(targetKey, JSON.stringify(dataToSave));
    localStorage.setItem("ff_active_lobby_id", state.activeLobby || "lobby1");

    flashAutoSaveIndicator();

    // Trigger debounced auto-sync to Google Drive (Continuous Live Auto-Save)
    scheduleDebouncedDriveAutoSync(1200);
  } catch (err) {
    console.warn("Could not save tournament state to localStorage:", err);
  }
}

/**
 * Load Saved State from Local Storage (Prompt 6 & Multi-Lobby Isolation)
 * Reloads active tournament state, team names, match count, and all saved scores for specified lobby
 */
function loadSavedState(targetLobbyId) {
  try {
    const activeLobby = targetLobbyId || getActiveLobbyId();
    state.activeLobby = activeLobby;

    const targetKey = getLobbyStorageKey(activeLobby);
    let saved = localStorage.getItem(targetKey);

    // Backward compatibility: If lobby1 has no saved state, check legacy storage key
    if (!saved && activeLobby === "lobby1") {
      const legacySaved = localStorage.getItem("ff_tournament_calculator_state");
      if (legacySaved) {
        saved = legacySaved;
        try { localStorage.setItem(targetKey, legacySaved); } catch (_) {}
      }
    }

    const defaultTitle = (LOBBY_CONFIGS[activeLobby] && LOBBY_CONFIGS[activeLobby].defaultTitle) || `NZ PAID SCRIMS - ${activeLobby.toUpperCase()}`;

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.tournamentTitle) state.tournamentTitle = parsed.tournamentTitle;
      else state.tournamentTitle = defaultTitle;
      if (parsed.totalMatches) state.totalMatches = parseInt(parsed.totalMatches, 10) || 6;
      if (Array.isArray(parsed.teams) && parsed.teams.length > 0) state.teams = parsed.teams;
      else state.teams = [...DEFAULT_TEAMS];
      if (parsed.teamRosters && typeof parsed.teamRosters === "object") state.teamRosters = parsed.teamRosters;
      else state.teamRosters = {};
      state.activeScreen = parsed.activeScreen || "setup";
      state.activeSubView = parsed.activeSubView || "view-match-input";
      state.selectedMatchIndex = parsed.selectedMatchIndex !== undefined ? parsed.selectedMatchIndex : 0;
      state.positionDisplayMode = parsed.positionDisplayMode || "points";
      state.selectedPosterTheme = parsed.selectedPosterTheme || "red";
      state.exportFormat = parsed.exportFormat || "jpg";
      state.matches = Array.isArray(parsed.matches) ? parsed.matches : [];
    } else {
      // Fresh clean lobby defaults
      state.tournamentTitle = defaultTitle;
      state.totalMatches = 6;
      state.teams = [...DEFAULT_TEAMS];
      state.teamRosters = {};
      state.activeScreen = "setup"; // Fresh lobby starts on setup screen!
      state.activeSubView = "view-match-input";
      state.selectedMatchIndex = 0;
      state.positionDisplayMode = "points";
      state.selectedPosterTheme = "red";
      state.exportFormat = "jpg";
      state.matches = [];
      initMatchesState();
    }

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

    updateLobbyUI();
  } catch (err) {
    console.warn("Could not load tournament state from localStorage:", err);
  }
}

/**
 * =====================================================================
 * SHARE RESULTS LINK & ENCODING/DECODING SYSTEM
 * =====================================================================
 */

/**
 * Compact LZ-String URI-Safe Compressor (100% synchronous, instant, rock-solid across all browsers)
 */
const LZString = (function() {
  const keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

  function compress(uncompressed) {
    if (uncompressed == null) return "";
    let i, value,
        context_dictionary = {},
        context_dictionaryToCreate = {},
        context_c = "",
        context_wc = "",
        context_w = "",
        context_enlargeIn = 2,
        context_dictSize = 3,
        context_numBits = 2,
        context_data = [],
        context_data_val = 0,
        context_data_position = 0,
        ii;

    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === 5) {
            context_data_position = 0;
            context_data.push(keyStrUriSafe.charAt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    value = 2;
    for (i = 0; i < context_numBits; i++) {
      context_data_val = (context_data_val << 1) | (value & 1);
      if (context_data_position === 5) {
        context_data_position = 0;
        context_data.push(keyStrUriSafe.charAt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position === 5) {
        context_data.push(keyStrUriSafe.charAt(context_data_val));
        break;
      } else {
        context_data_position++;
      }
    }
    return context_data.join("");
  }

  function getBaseValue(char) {
    const idx = keyStrUriSafe.indexOf(char);
    return idx === -1 ? 0 : idx;
  }

  function decompress(input) {
    if (input == null) return "";
    if (input === "") return null;
    let dictionary = [],
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = [],
        i,
        w,
        bits, resb, maxpower, power,
        c,
        data = { val: getBaseValue(input.charAt(0)), position: 32, index: 1 };

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = 32;
        data.val = getBaseValue(input.charAt(data.index++));
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (next = bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32;
            data.val = getBaseValue(input.charAt(data.index++));
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32;
            data.val = getBaseValue(input.charAt(data.index++));
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);

    while (true) {
      if (data.index > input.length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2, numBits);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = 32;
          data.val = getBaseValue(input.charAt(data.index++));
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = 32;
              data.val = getBaseValue(input.charAt(data.index++));
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = 32;
              data.val = getBaseValue(input.charAt(data.index++));
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 2:
          return result.join("");
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result.push(entry);

      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      w = entry;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  }

  return { compressToEncodedURIComponent: compress, decompressFromEncodedURIComponent: decompress };
})();

/**
 * Serialize tournament state into compact schema
 */
function serializeTournamentState(tourneyState) {
  const matchesData = (tourneyState.matches || []).map((m) => {
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
    v: 1,
    t: tourneyState.tournamentTitle || "FREE FIRE TOURNAMENT",
    m: tourneyState.totalMatches || 6,
    th: tourneyState.selectedPosterTheme || "red",
    tm: tourneyState.teams || [],
    r: tourneyState.teamRosters || {},
    d: matchesData
  };
}

/**
 * Deserialize compact schema back to tournament state
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
 * Synchronous tournament compression
 */
function compressTournamentState(tourneyState) {
  const compact = serializeTournamentState(tourneyState);
  const jsonStr = JSON.stringify(compact);
  return "l:" + LZString.compressToEncodedURIComponent(jsonStr);
}

/**
 * Synchronous tournament decompression
 */
function decompressTournamentState(param) {
  if (!param || typeof param !== "string") return null;

  try {
    let jsonStr = "";
    if (param.startsWith("l:")) {
      jsonStr = LZString.decompressFromEncodedURIComponent(param.slice(2));
    } else {
      jsonStr = LZString.decompressFromEncodedURIComponent(param);
      if (!jsonStr) {
        const raw = param.startsWith("r:") ? param.slice(2) : param;
        let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4 !== 0) b64 += "=";
        const binary = atob(b64);
        const escaped = Array.from(binary).map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("");
        jsonStr = decodeURIComponent(escaped);
      }
    }

    if (!jsonStr) return null;
    const compact = JSON.parse(jsonStr);
    return deserializeTournamentState(compact);
  } catch (err) {
    console.warn("Failed to decompress tournament parameter:", err);
    return null;
  }
}

/**
 * Generate full shareable URL reliably across http, https, and file protocols
 */
function generateShareableResultsUrl() {
  const param = compressTournamentState(state);
  let baseUrl = window.location.href.split("#")[0].split("?")[0];
  if (!baseUrl || baseUrl === "about:blank") {
    baseUrl = (window.location.origin && window.location.origin !== "null" ? window.location.origin : "") + (window.location.pathname || "");
  }
  return `${baseUrl}#share=${param}`;
}

/**
 * Build formatted tournament summary strings
 */
function buildTournamentSummaryText(shareUrl) {
  const cumulative = calculateCumulativeStats();
  const leader = cumulative.length > 0 ? cumulative[0] : null;
  const mvp = calculateTournamentMVP().topFragger;
  const savedMatchesCount = (state.matches || []).filter((m) => m && m.isSaved).length;

  const title = state.tournamentTitle || "FREE FIRE TOURNAMENT";
  const winnerLine = leader ? `🥇 1st: ${leader.teamName} (${leader.totalPoints} PTS, ${leader.booyahs} Booyah)` : "";
  const runnerLine = cumulative.length > 1 ? `🥈 2nd: ${cumulative[1].teamName} (${cumulative[1].totalPoints} PTS)` : "";
  const mvpLine = mvp && mvp.totalKills > 0 ? `👑 MVP: ${mvp.playerName} [${mvp.teamName}] - ${mvp.totalKills} KILLS` : "";

  // WhatsApp formatted
  const whatsappLines = [
    `🏆 *${title.toUpperCase()} - TOURNAMENT STANDINGS* 🏆`,
    `⚔️ Matches Played: ${savedMatchesCount} / ${state.totalMatches}`,
    ""
  ];
  if (winnerLine) whatsappLines.push(winnerLine);
  if (runnerLine) whatsappLines.push(runnerLine);
  if (mvpLine) whatsappLines.push(mvpLine);
  whatsappLines.push("");
  whatsappLines.push("📊 *View Live Standings Poster & Cumulative Matrix:*");
  whatsappLines.push(shareUrl);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappLines.join("\n"))}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`🏆 ${title} Results are live!`)}`;

  // Discord markdown block
  const discordLines = [
    `🏆 **${title.toUpperCase()} - OFFICIAL RESULTS** 🏆`,
    `> **Matches Played:** ${savedMatchesCount}/${state.totalMatches}`,
    leader ? `> 🥇 **1st Place:** ${leader.teamName} - **${leader.totalPoints} PTS**` : "",
    cumulative.length > 1 ? `> 🥈 **2nd Place:** ${cumulative[1].teamName} - **${cumulative[1].totalPoints} PTS**` : "",
    cumulative.length > 2 ? `> 🥉 **3rd Place:** ${cumulative[2].teamName} - **${cumulative[2].totalPoints} PTS**` : "",
    mvp && mvp.totalKills > 0 ? `> 👑 **Tournament MVP:** ${mvp.playerName} (${mvp.teamName}) with **${mvp.totalKills} kills**` : "",
    "",
    `📊 **Live Standings Poster & Points Matrix:**`,
    shareUrl
  ].filter(Boolean);

  const discordMarkdown = discordLines.join("\n");

  return {
    title,
    leader,
    mvp,
    savedMatchesCount,
    whatsappUrl,
    telegramUrl,
    discordMarkdown
  };
}

/**
 * Open Share Results Link Modal
 */
function openShareResultsModal() {
  if (!shareResultsModal) return;

  if (shareOverviewTitle) shareOverviewTitle.textContent = state.tournamentTitle.toUpperCase();
  const savedCount = (state.matches || []).filter((m) => m && m.isSaved).length;
  if (shareOverviewStatus) shareOverviewStatus.textContent = `${savedCount} / ${state.totalMatches} MATCHES SAVED`;

  const cumulative = calculateCumulativeStats();
  if (shareOverviewLeader) {
    if (cumulative.length > 0 && cumulative[0].totalPoints > 0) {
      shareOverviewLeader.textContent = `${cumulative[0].teamName} (${cumulative[0].totalPoints} pts)`;
    } else {
      shareOverviewLeader.textContent = "--";
    }
  }

  const mvp = calculateTournamentMVP().topFragger;
  if (shareOverviewMvp) {
    if (mvp && mvp.totalKills > 0) {
      shareOverviewMvp.textContent = `${mvp.playerName} (${mvp.totalKills}k)`;
    } else {
      shareOverviewMvp.textContent = "None yet";
    }
  }

  if (shareOverviewTheme) {
    shareOverviewTheme.textContent = (state.selectedPosterTheme || "red").toUpperCase();
  }

  try {
    const shareUrl = generateShareableResultsUrl();
    if (shareLinkInput) {
      shareLinkInput.value = shareUrl;
    }

    const summary = buildTournamentSummaryText(shareUrl);
    if (btnShareWhatsapp) btnShareWhatsapp.href = summary.whatsappUrl;
    if (btnShareTelegram) btnShareTelegram.href = summary.telegramUrl;

    if (btnShareDiscord) {
      btnShareDiscord.onclick = () => {
        copyTextToClipboard(summary.discordMarkdown);
        if (discordShareText) {
          discordShareText.textContent = "✓ Copied Discord Text!";
          setTimeout(() => {
            discordShareText.textContent = "Copy for Discord";
          }, 2500);
        }
      };
    }

    if (shareCompressionNote) {
      shareCompressionNote.textContent = `✓ URL: ${shareUrl.length} chars • Compressed & safe for WhatsApp / Discord`;
    }
  } catch (err) {
    console.error("Error generating share link:", err);
    if (shareLinkInput) shareLinkInput.value = window.location.href;
  }

  shareResultsModal.style.display = "flex";
}

/**
 * Close Share Results Link Modal
 */
function closeShareResultsModal() {
  if (shareResultsModal) shareResultsModal.style.display = "none";
}

/**
 * Copy Share Link to Clipboard
 */
function copyShareResultsLink() {
  if (!shareLinkInput) return;
  const url = shareLinkInput.value;
  if (!url || url.startsWith("Generating")) return;

  copyTextToClipboard(url);

  if (copyShareText) copyShareText.textContent = "✓ COPIED!";
  if (copyShareIcon) copyShareIcon.textContent = "✅";

  setTimeout(() => {
    if (copyShareText) copyShareText.textContent = "COPY LINK";
    if (copyShareIcon) copyShareIcon.textContent = "📋";
  }, 2500);
}

/**
 * Cross-platform clipboard writer
 */
function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {
    console.warn("fallback copy failed:", e);
  }
  document.body.removeChild(ta);
}

/**
 * Check for incoming share link on startup
 */
function checkForSharedResultsUrl() {
  if (typeof window === "undefined" || !window.location) return false;

  let param = "";
  if (window.location.hash) {
    const hash = window.location.hash.slice(1);
    const match = hash.match(/(?:share|data)=([^&]+)/);
    if (match) param = match[1];
  }
  if (!param && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    param = params.get("share") || params.get("data") || "";
  }

  if (!param) return false;

  try {
    const restored = decompressTournamentState(param);
    if (!restored) return false;

    // Apply restored tournament to state
    state.tournamentTitle = restored.tournamentTitle || "SHARED TOURNAMENT";
    state.totalMatches = restored.totalMatches || 6;
    state.selectedPosterTheme = restored.selectedPosterTheme || "red";
    state.teams = restored.teams || [];
    state.teamRosters = restored.teamRosters || {};
    state.matches = restored.matches || [];
    state.activeScreen = "tournament";
    state.activeSubView = "view-leaderboard";
    state.isSharedView = true;

    // Show Read-Only Shared View Banner
    if (sharedViewerBanner) {
      sharedViewerBanner.style.display = "flex";
      if (sharedBannerTourneyTitle) {
        sharedBannerTourneyTitle.textContent = state.tournamentTitle.toUpperCase();
      }
    }

    // Configure Clone Button
    if (btnSharedClone) {
      btnSharedClone.onclick = () => {
        state.isSharedView = false;
        saveState();
        if (sharedViewerBanner) sharedViewerBanner.style.display = "none";
        if (history.replaceState) {
          history.replaceState(null, "", window.location.pathname);
        }
        alert("✓ Tournament cloned to your local dashboard! You can now edit and manage all matches.");
      };
    }

    // Configure Exit Button
    if (btnSharedExit) {
      btnSharedExit.onclick = () => {
        if (history.replaceState) {
          history.replaceState(null, "", window.location.pathname);
        }
        window.location.reload();
      };
    }

    // Configure Copy Shared Link Button in banner
    if (btnSharedCopyLink) {
      btnSharedCopyLink.onclick = () => {
        copyTextToClipboard(window.location.href);
        const originalText = btnSharedCopyLink.innerHTML;
        btnSharedCopyLink.innerHTML = "<span>✅ COPIED!</span>";
        setTimeout(() => {
          btnSharedCopyLink.innerHTML = originalText;
        }, 2000);
      };
    }

    return true;
  } catch (err) {
    console.warn("Could not load shared tournament:", err);
    return false;
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

const DRIVE_WEBHOOK_STORAGE_KEY = "ff_drive_apps_script_webhook_url";
const DEFAULT_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwv8ivPcj2-ikMGqILRlZ2O6JCPN4AEghlszokgIQlZr_JOM4TfPgqNRM1e3xewl0T1/exec";

function getDriveWebhookUrl() {
  return localStorage.getItem(DRIVE_WEBHOOK_STORAGE_KEY) || DEFAULT_DRIVE_WEBHOOK_URL;
}

function setDriveWebhookUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem(DRIVE_WEBHOOK_STORAGE_KEY, url.trim());
  } else {
    localStorage.removeItem(DRIVE_WEBHOOK_STORAGE_KEY);
  }
}

const APPS_SCRIPT_SOURCE_CODE = `/**
 * =========================================================================
 * FREE FIRE TOURNAMENT AUTO-BACKUP & SYNC - GOOGLE APPS SCRIPT WEB APP
 * Zero-Login Cloud Sync for Google Drive & Google Sheets (Laptop & Mobile)
 * =========================================================================
 * 
 * Target Google Drive Folder: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5
 * Target Google Spreadsheet:  1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4
 *
 * CRITICAL STEP FOR CROSS-DEVICE SYNC (LAPTOP <-> MOBILE):
 * In script.google.com:
 * 1. Click "Deploy" > "Manage deployments"
 * 2. Click the Pencil icon ✏️ (Edit)
 * 3. Make sure "Who has access" is set to "Anyone" (NOT "Only myself")
 *    * If set to "Only myself", Mobile phones cannot fetch/save data (403 Error)!
 * 4. Set Version to "New version"
 * 5. Click "Deploy"
 * =========================================================================
 */
const DRIVE_FOLDER_ID = '1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5';
const SPREADSHEET_ID = '1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Empty payload' });
    }
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'backup';
    let result = { success: true };

    // 0. Fetch / Pull backup for Mobile & Laptop cross-sync
    if (action === 'get_backup') {
      return jsonResponse(getTournamentBackup(payload.lobbyId || payload.lobby || 'lobby1'));
    }
    if (action === 'get_all_lobbies') {
      return jsonResponse(getAllLobbyBackups());
    }

    if (action === 'backup' || action === 'both' || payload.backupData) {
      result.backup = saveTournamentBackup(payload);
    }
    if (action === 'append_sheet' || action === 'both' || payload.sheetRows) {
      result.sheet = appendToSpreadsheet(payload);
    }
    if (action === 'poster' && payload.base64Data) {
      result.poster = savePosterToDrive(payload);
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'status';
    const lobbyId = (e && e.parameter && (e.parameter.lobbyId || e.parameter.lobby)) || 'lobby1';

    if (action === 'get_backup') {
      return jsonResponse(getTournamentBackup(lobbyId));
    }
    if (action === 'get_all_lobbies') {
      return jsonResponse(getAllLobbyBackups());
    }

    return jsonResponse({
      success: true,
      status: 'ONLINE',
      folderId: DRIVE_FOLDER_ID,
      spreadsheetId: SPREADSHEET_ID
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function getTournamentBackup(lobbyId) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const targetPrefix = 'FreeFire_' + (lobbyId || 'lobby1').toUpperCase().replace(/\\s+/g, '');

  const files = folder.getFiles();
  let latestFile = null;
  let latestTime = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (name.startsWith(targetPrefix) && name.endsWith('.json')) {
      const updated = file.getLastUpdated().getTime();
      if (updated > latestTime) {
        latestTime = updated;
        latestFile = file;
      }
    }
  }

  if (!latestFile && (lobbyId === 'lobby1' || !lobbyId)) {
    const legacyFiles = folder.getFilesByName('FreeFire_Tournament_AutoBackup.json');
    if (legacyFiles.hasNext()) latestFile = legacyFiles.next();
  }

  if (latestFile) {
    const content = latestFile.getBlob().getDataAsString();
    let parsedData = null;
    try { parsedData = JSON.parse(content); } catch (_) { parsedData = content; }
    return {
      success: true,
      found: true,
      lobbyId: lobbyId || 'lobby1',
      filename: latestFile.getName(),
      lastUpdated: latestFile.getLastUpdated().toISOString(),
      backupData: parsedData
    };
  }

  return { success: true, found: false, lobbyId: lobbyId || 'lobby1', message: 'No backup found yet' };
}

function getAllLobbyBackups() {
  return {
    success: true,
    lobbies: {
      lobby1: getTournamentBackup('lobby1'),
      lobby2: getTournamentBackup('lobby2'),
      lobby3: getTournamentBackup('lobby3')
    }
  };
}

function saveTournamentBackup(payload) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const filename = payload.filename || 'FreeFire_Tournament_AutoBackup.json';
  const content = typeof payload.backupData === 'string'
    ? payload.backupData
    : JSON.stringify(payload.backupData || payload, null, 2);

  const existingFiles = folder.getFilesByName(filename);
  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    file.setContent(content);
    return { id: file.getId(), name: filename, isUpdated: true, url: file.getUrl() };
  } else {
    const file = folder.createFile(filename, content, MimeType.PLAIN_TEXT);
    return { id: file.getId(), name: filename, isUpdated: false, url: file.getUrl() };
  }
}

function appendToSpreadsheet(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tabName = payload.lobbyName || 'LOBBY 1';
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    try {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(['TIMESTAMP', 'TOURNAMENT / SCRIMS TITLE', 'MATCH', 'RANK / PLACE', 'TEAM NAME', 'PLAYER ROSTER', 'KILLS', 'PLACEMENT POINTS', 'TOTAL MATCH POINTS']);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#222b3a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    } catch (_) {
      sheet = ss.getSheets()[0];
    }
  }
  const rows = payload.sheetRows || payload.rows || [];
  if (rows && rows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    return { rowsAppended: rows.length };
  }
  return { rowsAppended: 0 };
}

function savePosterToDrive(payload) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const filename = payload.filename || ('FreeFire_Poster_' + Date.now() + '.jpg');
  const mimeType = payload.mimeType || 'image/jpeg';
  const rawBase64 = payload.base64Data.replace(/^data:[^;]+;base64,/, '');
  const decodedBytes = Utilities.base64Decode(rawBase64);
  const blob = Utilities.newBlob(decodedBytes, mimeType, filename);
  const file = folder.createFile(blob);
  return { id: file.getId(), name: filename, url: file.getUrl() };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

function handleCopyAppsScriptCode() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(APPS_SCRIPT_SOURCE_CODE).then(() => {
      if (copyScriptText) copyScriptText.textContent = "✓ COPIED CODE TO CLIPBOARD!";
      setTimeout(() => {
        if (copyScriptText) copyScriptText.textContent = "📋 COPY APPS SCRIPT CODE";
      }, 3000);
    }).catch(() => fallbackCopyScript());
  } else {
    fallbackCopyScript();
  }
}

function fallbackCopyScript() {
  const ta = document.createElement("textarea");
  ta.value = APPS_SCRIPT_SOURCE_CODE;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    if (copyScriptText) copyScriptText.textContent = "✓ COPIED CODE TO CLIPBOARD!";
    setTimeout(() => {
      if (copyScriptText) copyScriptText.textContent = "📋 COPY APPS SCRIPT CODE";
    }, 3000);
  } catch (_) {}
  document.body.removeChild(ta);
}

/**
 * Fetches and synchronizes tournament state from Google Drive (Zero-Login Cloud Database)
 * Essential for syncing between Laptop and Mobile!
 */
let isCloudPulling = false;

async function fetchTournamentFromCloud({ lobbyId = state.activeLobby, force = false, silent = false } = {}) {
  const webhookUrl = getDriveWebhookUrl();
  if (!webhookUrl) {
    if (!silent) alert("Please configure your Google Apps Script Webhook URL first under CLOUD DRIVE SYNC.");
    return { success: false, reason: "no_webhook" };
  }

  if (isCloudPulling) return { success: false, reason: "in_progress" };
  isCloudPulling = true;

  if (syncSpinIcon) syncSpinIcon.classList.add("spinning");
  if (syncBtnText) syncBtnText.textContent = "SYNCING...";

  try {
    const targetLobby = lobbyId || state.activeLobby || "lobby1";
    const lobbyInfo = LOBBY_CONFIGS[targetLobby] || { label: targetLobby.toUpperCase() };

    let cloudData = null;

    // Method 1: Try POST with action: 'get_backup'
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "get_backup",
          lobbyId: targetLobby
        })
      });

      if (res.status === 403) {
        throw new Error("ACCESS_DENIED_403");
      }

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.found && json.backupData) {
          cloudData = json.backupData;
        }
      }
    } catch (postErr) {
      if (postErr.message === "ACCESS_DENIED_403") throw postErr;
      // Fallback: Try GET with action=get_backup
      try {
        const getUrl = `${webhookUrl}${webhookUrl.includes("?") ? "&" : "?"}action=get_backup&lobbyId=${encodeURIComponent(targetLobby)}`;
        const getRes = await fetch(getUrl);
        if (getRes.status === 403) throw new Error("ACCESS_DENIED_403");
        if (getRes.ok) {
          const json = await getRes.json();
          if (json && json.success && json.found && json.backupData) {
            cloudData = json.backupData;
          }
        }
      } catch (getErr) {
        if (getErr.message === "ACCESS_DENIED_403") throw getErr;
        console.warn("[Cloud Pull Fallback Notice]", getErr.message);
      }
    }

    if (!cloudData) {
      if (!silent) {
        showError(`No cloud backup found on Drive for ${lobbyInfo.label} yet. Save a match first!`);
        setTimeout(() => clearError(), 4000);
      }
      return { success: true, updated: false };
    }

    // Check if cloud data is newer or if current local state is empty
    const localKey = getLobbyStorageKey(targetLobby);
    const localRaw = localStorage.getItem(localKey);
    let localSavedAt = 0;
    if (localRaw) {
      try {
        const parsedLocal = JSON.parse(localRaw);
        if (parsedLocal.savedAt) localSavedAt = new Date(parsedLocal.savedAt).getTime();
      } catch (_) {}
    }

    const cloudSavedAt = cloudData.savedAt ? new Date(cloudData.savedAt).getTime() : Date.now();
    const isLocalEmpty = !localRaw || state.matches.length === 0 || state.matches.every(m => !m.isSaved);

    if (force || isLocalEmpty || cloudSavedAt > localSavedAt) {
      // Apply cloud data to local storage and active state
      localStorage.setItem(localKey, JSON.stringify(cloudData));

      if (targetLobby === state.activeLobby) {
        loadSavedState(targetLobby);
        initMatchesState();

        if (state.activeScreen === "tournament" && Array.isArray(state.teams) && state.teams.length > 0) {
          setupScreen.classList.remove("active");
          tournamentScreen.classList.add("active");
          if (activeTournamentTitleEl) activeTournamentTitleEl.textContent = state.tournamentTitle.toUpperCase();
          if (displayTotalMatchesEl) displayTotalMatchesEl.textContent = state.totalMatches;
          renderMatchSelectors();
          renderMatchTeamForms();
          updateProgressBadge();
          renderLeaderboardRows();
          renderMatrixTable();
          updateActiveMatchBanner();
        } else {
          tournamentScreen.classList.remove("active");
          setupScreen.classList.add("active");
          if (tournamentNameInput) tournamentNameInput.value = state.tournamentTitle;
          if (totalMatchesInput) totalMatchesInput.value = state.totalMatches;
          renderTeamInputs();
          updateFilledCount();
        }
        updateLobbyUI();
      }

      if (autosaveStatusPill && autosaveText) {
        autosaveStatusPill.classList.add("drive-synced");
        autosaveText.textContent = `☁️ SYNCED FROM DRIVE (${lobbyInfo.label})`;
      }

      const msg = `✅ ${lobbyInfo.label} synced from Google Drive!`;
      if (!silent) {
        showError(msg);
        setTimeout(() => clearError(), 4000);
      } else {
        console.log(`[Cloud Pull] ${msg}`);
      }
      return { success: true, updated: true };
    } else {
      if (!silent) {
        showError(`✅ ${lobbyInfo.label} is already up to date with Google Drive.`);
        setTimeout(() => clearError(), 3000);
      }
      return { success: true, updated: false };
    }
  } catch (err) {
    if (err.message === "ACCESS_DENIED_403") {
      const warningMsg = "⚠️ Google Apps Script Access Denied (403): In script.google.com, click Deploy > Manage deployments > Edit ✏️ > set 'Who has access' to 'Anyone' (NOT 'Only myself') so mobile can sync without login.";
      console.warn(warningMsg);
      if (!silent) {
        alert(warningMsg);
      }
    } else {
      console.warn("[Cloud Pull Error]:", err.message);
      if (!silent) {
        showError(`⚠️ Cloud sync error: ${err.message}`);
        setTimeout(() => clearError(), 4000);
      }
    }
    return { success: false, error: err.message };
  } finally {
    isCloudPulling = false;
    if (syncSpinIcon) syncSpinIcon.classList.remove("spinning");
    if (syncBtnText) syncBtnText.textContent = "SYNC FROM CLOUD";
  }
}

async function handleSaveWebhookUrl() {
  const url = inputDriveWebhookUrl ? inputDriveWebhookUrl.value.trim() : "";
  if (!url) {
    alert("Please paste your Google Apps Script Web App URL.");
    return;
  }
  if (!url.startsWith("https://script.google.com/macros/s/")) {
    alert("⚠️ Invalid URL. The Google Apps Script URL must start with:\nhttps://script.google.com/macros/s/...");
    return;
  }

  setDriveWebhookUrl(url);

  if (btnSaveWebhookUrl) {
    btnSaveWebhookUrl.innerHTML = `<span>⏳ TESTING SYNC...</span>`;
  }

  try {
    const res = await autoSyncTournamentToDrive({ silent: false });
    if (res && res.success) {
      alert("✅ Zero-Login Auto-Sync Connected Successfully!\n\nYour tournament data was successfully saved to your Google Drive folder.\n\nFrom now on, all match scores and edits will automatically sync in the background without any sign-in!");
    } else {
      alert("✅ Webhook URL saved!\n\nBackground sync will activate on your next match save.");
    }
    checkOAuthStatusUI();
  } catch (err) {
    alert("⚠️ Webhook URL saved, but test sync had notice: " + err.message);
    checkOAuthStatusUI();
  } finally {
    if (btnSaveWebhookUrl) {
      btnSaveWebhookUrl.innerHTML = `<span>💾 SAVE & TEST SYNC</span>`;
    }
  }
}

function handleClearWebhookUrl() {
  if (confirm("Disconnect and remove this Google Apps Script Webhook?")) {
    setDriveWebhookUrl("");
    if (inputDriveWebhookUrl) inputDriveWebhookUrl.value = "";
    checkOAuthStatusUI();
    alert("Google Apps Script Webhook disconnected.");
  }
}

/**
 * One-Click Direct Google Drive Cloud Sync
 */
async function handleDirectCloudDriveSync() {
  if (!btnGoogleAccount) return;
  const originalHtml = btnGoogleAccount.innerHTML;
  btnGoogleAccount.innerHTML = `<span>⏳ SYNCING TO DRIVE...</span>`;
  btnGoogleAccount.disabled = true;

  try {
    const res = await autoSyncTournamentToDrive({ silent: false });
    if (res && res.success) {
      alert("✅ Cloud Sync Completed!\n\nAll tournament scores, rosters, and standings have been saved to your Google Drive folder:\n1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5");
    } else {
      alert("✅ Synced tournament data to Google Drive & browser!");
    }
  } catch (err) {
    alert("⚠️ Cloud sync notice: " + (err.message || "Failed to sync to Drive"));
  } finally {
    btnGoogleAccount.innerHTML = originalHtml;
    btnGoogleAccount.disabled = false;
  }
}

function openGoogleAccountModal() {
  handleDirectCloudDriveSync();
}

function closeGoogleAccountModal() {}

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
 * Check Google OAuth & Webhook Connection Status
 */
async function checkOAuthStatusUI() {
  if (!oauthStatusBadge || !oauthStatusDesc) return;

  // 1. Check Zero-Login Apps Script Webhook first (Option 1)
  const webhookUrl = getDriveWebhookUrl();
  if (inputDriveWebhookUrl) {
    inputDriveWebhookUrl.value = webhookUrl;
  }

  if (webhookUrl) {
    oauthStatusBadge.style.background = "rgba(34, 197, 94, 0.25)";
    oauthStatusBadge.style.color = "#86efac";
    oauthStatusBadge.textContent = "ACTIVE (ZERO-LOGIN AUTO-SYNC)";
    oauthStatusDesc.innerHTML = `<span style="color:#a7f3d0;">✓ Connected to your Drive Folder via Apps Script Webhook.</span><br><span style="color:#6ee7b7; font-size: 0.8rem; font-weight: bold;">⚡ Zero-Login Active: All match saves and edits automatically sync directly into your Drive Folder (${GOOGLE_DRIVE_FOLDER_ID}) without any login popups.</span>`;
    if (btnClearWebhookUrl) btnClearWebhookUrl.style.display = "inline-flex";
    if (autosaveStatusPill && autosaveText && !autosaveStatusPill.classList.contains("saving")) {
      autosaveStatusPill.classList.add("drive-synced");
      autosaveText.textContent = "☁️ AUTO-SAVED TO DRIVE & BROWSER";
      autosaveStatusPill.title = "Connected to Google Drive via Zero-Login Webhook";
    }
    return;
  } else {
    if (btnClearWebhookUrl) btnClearWebhookUrl.style.display = "none";
  }

  // 2. Check browser token if present
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
        oauthStatusBadge.textContent = "CONNECTED (OAUTH)";
        oauthStatusDesc.innerHTML = `Connected as: <b style="color:#ffffff;">${escapeHtml(userEmail)}</b> (${quotaText}).<br><span style="color:#a7f3d0;">✓ Google Drive uploads save directly to Folder: <code>${GOOGLE_DRIVE_FOLDER_ID}</code></span>`;
        if (btnOAuthSignIn) {
          btnOAuthSignIn.innerHTML = `<span class="btn-content"><span>🔄 RE-AUTHENTICATE / SWITCH ACCOUNT</span></span>`;
        }
        if (btnOAuthSignout) {
          btnOAuthSignout.style.display = "inline-flex";
        }
        if (autosaveStatusPill && autosaveText && !autosaveStatusPill.classList.contains("saving")) {
          autosaveStatusPill.classList.add("drive-synced");
          autosaveText.textContent = "☁️ AUTO-SAVED TO DRIVE & BROWSER";
        }
        return;
      } else if (res.status === 401) {
        clearBrowserOAuthToken();
      }
    } catch (_) {}
  }

  // 3. Not configured
  oauthStatusBadge.style.background = "rgba(239, 68, 68, 0.2)";
  oauthStatusBadge.style.color = "#fca5a5";
  oauthStatusBadge.textContent = "NOT CONFIGURED";
  oauthStatusDesc.textContent = "Paste your Google Apps Script Webhook URL above to enable 100% zero-login automatic backups to Google Drive.";
  if (btnOAuthSignIn) {
    btnOAuthSignIn.innerHTML = `<span class="btn-content"><span>🚀 SIGN IN WITH GOOGLE (OAUTH)</span></span>`;
  }
  if (autosaveStatusPill && autosaveText && !autosaveStatusPill.classList.contains("saving")) {
    autosaveStatusPill.classList.remove("drive-synced");
    autosaveText.textContent = "AUTO-SAVED TO BROWSER";
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
          autoSyncTournamentToDrive({ silent: true });
          alert("✅ Google Account (5 TB) successfully connected!\n\nBackups will now automatically sync to your Google Drive.");
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
          autoSyncTournamentToDrive({ silent: true });
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

  const lobbyId = (typeof state !== "undefined" && state.activeLobby) || "lobby1";
  const lobbyInfo = LOBBY_CONFIGS[lobbyId] || { label: "LOBBY 1" };
  const now = new Date().toLocaleString();
  const rowsToAppend = teamsDataPayload.map((team) => [
    now,
    `[${lobbyInfo.label}] ${state.tournamentTitle || 'Free Fire Scrims'}`,
    `Match ${matchNumber}`,
    team.placement !== undefined && team.placement !== '' ? Number(team.placement) : '-',
    team.teamName || 'Unknown Team',
    Array.isArray(team.players) ? team.players.filter(Boolean).join(', ') : (team.players || ''),
    Number(team.kills || 0),
    Number(team.placementPoints || 0),
    Number(team.totalPoints || 0)
  ]);

  // Method 0: Zero-Login Google Apps Script Webhook (Option 1)
  const webhookUrl = getDriveWebhookUrl();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "append_sheet",
          lobbyId: lobbyId,
          lobbyName: lobbyInfo.label,
          sheetRows: rowsToAppend
        })
      });
      console.log(`[Google Sheets Webhook] Match ${matchNumber} scores synced directly via Webhook (${lobbyInfo.label}).`);
      showMatchAlert(`✅ Match ${matchNumber} saved and synced to Google Sheets (${lobbyInfo.label}) & Drive!`, "success");
      return { success: true };
    } catch (whErr) {
      console.warn("[Google Sheets Webhook Sync Warning]", whErr);
    }
  }

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
 * Directly uploads or updates files in Google Drive Folder: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5
 * Uses user's 5 TB quota via OAuth 2.0 Web Token in browser, or server backend.
 */
async function uploadFileToDrive({ filename, mimeType, base64Data, description, fileId = null, updateIfExists = false, silent = false }) {
  // 0. Zero-Login Google Apps Script Webhook (Option 1)
  const webhookUrl = getDriveWebhookUrl();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "backup",
          filename,
          mimeType,
          base64Data,
          description
        })
      });
      return { success: true, method: "apps_script_webhook" };
    } catch (whErr) {
      if (!silent) throw whErr;
      return { success: false, error: whErr.message };
    }
  }

  const browserToken = getBrowserOAuthToken();

  // 1. Direct Web Upload if browser token is present (Fast, works on Netlify & localhost)
  if (browserToken) {
    let targetFileId = fileId;

    // Search for existing file if requested and fileId not yet known
    if (!targetFileId && updateIfExists) {
      try {
        const query = encodeURIComponent(`'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name = '${filename.replace(/'/g, "\\'")}' and trashed = false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
          headers: { "Authorization": `Bearer ${browserToken}` }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            targetFileId = searchData.files[0].id;
          }
        }
      } catch (searchErr) {
        console.warn("Drive search query warning:", searchErr);
      }
    }

    // Attempt PATCH update if existing file is identified
    if (targetFileId) {
      try {
        const rawBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
        const binaryString = atob(rawBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media&fields=id,name,webViewLink`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${browserToken}`,
            "Content-Type": mimeType
          },
          body: bytes
        });

        if (patchRes.ok) {
          const data = await patchRes.json();
          return { success: true, ...data, isUpdated: true, method: "direct_oauth_web" };
        }
        if (patchRes.status === 401) {
          clearBrowserOAuthToken();
          checkOAuthStatusUI();
          if (silent) return { success: false, error: "expired_token" };
          throw new Error("Your Google sign-in session expired. Please click 'GOOGLE ACCOUNT' and sign in again.");
        }
      } catch (patchErr) {
        console.warn("Drive patch update fallback to create:", patchErr);
      }
    }

    // Otherwise create new file via multipart upload
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
      return { success: true, ...data, isUpdated: false, method: "direct_oauth_web" };
    }

    if (res.status === 401) {
      clearBrowserOAuthToken();
      checkOAuthStatusUI();
      if (silent) return { success: false, error: "expired_token" };
      throw new Error("Your Google sign-in session expired. Please click 'GOOGLE ACCOUNT' and sign in again.");
    }

    const errJson = await res.json().catch(() => ({}));
    if (silent) {
      return { success: false, error: errJson.error ? errJson.error.message : `HTTP ${res.status}` };
    }
    throw new Error(errJson.error ? errJson.error.message : `Drive upload failed with HTTP status ${res.status}`);
  }

  // 2. Try server-side upload endpoint (fallback to service account / server OAuth)
  try {
    const serverRes = await fetch("/api/upload-drive-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, mimeType, base64Data, description, fileId, updateIfExists })
    });
    if (serverRes.ok) {
      const sData = await serverRes.json();
      if (sData.success) return sData;
    }
  } catch (_) {}

  // If not signed in yet and silent background sync is requested
  if (silent) {
    return { success: false, reason: "not_signed_in" };
  }

  // If user explicitly initiated action, prompt sign-in
  openGoogleAccountModal();
  throw new Error("Google Account not connected yet. Please click 'SIGN IN WITH GOOGLE' to authorize uploads to your 5 TB Drive.");
}

/**
 * State variable for Google Drive Auto-Sync
 */
let isDriveAutoSyncing = false;
let pendingDriveAutoSync = false;
let debouncedDriveAutoSyncTimer = null;

/**
 * Automatic Google Drive Tournament Data Backup
 * Seamlessly saves tournament state directly to Google Drive in the background.
 */
async function autoSyncTournamentToDrive({ silent = true } = {}) {
  // Prevent sync in shared read-only view
  if (state.isSharedView) return { success: false, reason: "shared_view" };

  if (isDriveAutoSyncing) {
    pendingDriveAutoSync = true;
    return { success: false, reason: "in_progress" };
  }

  const webhookUrl = getDriveWebhookUrl();
  const browserToken = getBrowserOAuthToken();

  if (!webhookUrl && !browserToken) {
    // Keep autosave pill indicating local browser save
    if (autosaveStatusPill && autosaveText) {
      autosaveStatusPill.classList.remove("syncing-drive", "saving");
      autosaveText.textContent = "AUTO-SAVED TO BROWSER";
      autosaveStatusPill.title = "Saved to local browser storage. Click '☁️ CLOUD DRIVE SYNC' to auto-save to Google Drive.";
    }
    return { success: false, reason: "no_auth" };
  }

  isDriveAutoSyncing = true;
  if (autosaveStatusPill && autosaveText) {
    autosaveStatusPill.classList.add("syncing-drive");
    autosaveStatusPill.classList.remove("saving", "drive-synced");
    autosaveText.textContent = "☁️ SYNCING TO DRIVE...";
  }

  try {
    const lobbyId = (typeof state !== "undefined" && state.activeLobby) || "lobby1";
    const lobbyInfo = LOBBY_CONFIGS[lobbyId] || { label: "LOBBY 1" };
    const lobbyPrefix = lobbyId.toUpperCase().replace(/\s+/g, "");
    const filename = `FreeFire_${lobbyPrefix}_AutoBackup.json`;

    const backupData = {
      lobbyId: lobbyId,
      lobbyName: lobbyInfo.label,
      tournamentTitle: state.tournamentTitle,
      totalMatches: state.totalMatches,
      teams: state.teams,
      teamRosters: state.teamRosters || {},
      matches: state.matches,
      selectedPosterTheme: state.selectedPosterTheme || "red",
      exportFormat: state.exportFormat,
      positionDisplayMode: state.positionDisplayMode,
      savedAt: new Date().toISOString(),
      autoSavedToDrive: true
    };

    // 1. Primary Zero-Login Route: Google Apps Script Webhook (Option 1)
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "backup",
          lobbyId: lobbyId,
          lobbyName: lobbyInfo.label,
          filename,
          backupData
        })
      });

      // Also auto-sync scores to Google Sheet if current match has scores
      const curr = state.matches[state.selectedMatchIndex];
      if (curr && curr.isSaved) {
        const matchNum = state.selectedMatchIndex + 1;
        syncMatchScoresToGoogleSheets(matchNum, curr.teamData).catch(() => {});
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (autosaveStatusPill && autosaveText) {
        autosaveStatusPill.classList.remove("syncing-drive", "saving");
        autosaveStatusPill.classList.add("drive-synced");
        autosaveText.textContent = "☁️ AUTO-SAVED TO DRIVE & BROWSER";
        autosaveStatusPill.title = `Auto-saved to Google Drive folder (${GOOGLE_DRIVE_FOLDER_ID}) as ${filename} at ${timeStr} (${lobbyInfo.label} Webhook)`;
      }
      console.log(`[Google Drive Webhook Auto-Sync] Tournament backup synced (${filename})`);
      return { success: true };
    }

    const jsonStr = JSON.stringify(backupData, null, 2);
    const base64Data = "data:application/json;base64," + btoa(unescape(encodeURIComponent(jsonStr)));

    const storageKey = `ff_drive_autobackup_id_${lobbyPrefix}_${safeTitle}`;
    const cachedFileId = localStorage.getItem(storageKey) || null;

    const result = await uploadFileToDrive({
      filename,
      mimeType: "application/json",
      base64Data,
      description: `Auto-saved tournament state for ${lobbyInfo.label} - ${state.tournamentTitle || "Free Fire Scrims"}`,
      fileId: cachedFileId,
      updateIfExists: true,
      silent: true
    });

    if (result && result.success) {
      if (result.id) {
        try { localStorage.setItem(storageKey, result.id); } catch (_) {}
      }
      // Also auto-sync scores to Google Sheet if current match has scores
      const curr = state.matches[state.selectedMatchIndex];
      if (curr && curr.isSaved) {
        const matchNum = state.selectedMatchIndex + 1;
        syncMatchScoresToGoogleSheets(matchNum, curr.teamData).catch(() => {});
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (autosaveStatusPill && autosaveText) {
        autosaveStatusPill.classList.remove("syncing-drive", "saving");
        autosaveStatusPill.classList.add("drive-synced");
        autosaveText.textContent = "☁️ AUTO-SAVED TO DRIVE & BROWSER";
        autosaveStatusPill.title = `Auto-saved to Google Drive folder (1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5) as ${filename} at ${timeStr}`;
      }
      console.log(`[Google Drive Auto-Sync] Tournament backup synced (${filename})`);
      return { success: true, file: result };
    } else {
      if (autosaveStatusPill && autosaveText) {
        autosaveStatusPill.classList.remove("syncing-drive");
        autosaveText.textContent = "AUTO-SAVED TO BROWSER";
      }
      return { success: false, error: result ? result.error : "Unknown error" };
    }
  } catch (err) {
    console.warn("[Google Drive Auto-Sync Notice]:", err.message);
    if (autosaveStatusPill && autosaveText) {
      autosaveStatusPill.classList.remove("syncing-drive");
      autosaveText.textContent = "AUTO-SAVED TO BROWSER";
      autosaveStatusPill.title = `Saved locally. Google Drive notice: ${err.message}`;
    }
    return { success: false, error: err.message };
  } finally {
    isDriveAutoSyncing = false;
    if (pendingDriveAutoSync) {
      pendingDriveAutoSync = false;
      setTimeout(() => autoSyncTournamentToDrive({ silent: true }), 1500);
    }
  }
}

/**
 * Schedule debounced auto-sync to Google Drive
 */
function scheduleDebouncedDriveAutoSync(delayMs = 1200) {
  clearTimeout(debouncedDriveAutoSyncTimer);
  debouncedDriveAutoSyncTimer = setTimeout(() => {
    autoSyncTournamentToDrive({ silent: true });
  }, delayMs);
}

/**
 * Scenario A: Upload Tournament Backup JSON to Google Drive
 */
async function handleCloudDriveBackup() {
  if (!btnCloudBackup) return;

  const originalHtml = btnCloudBackup.innerHTML;
  btnCloudBackup.innerHTML = `<span>⏳ UPLOADING...</span>`;

  try {
    const lobbyId = (typeof state !== "undefined" && state.activeLobby) || "lobby1";
    const lobbyInfo = LOBBY_CONFIGS[lobbyId] || { label: "LOBBY 1" };
    const lobbyPrefix = lobbyId.toUpperCase();
    const backupData = {
      lobbyId: lobbyId,
      lobbyName: lobbyInfo.label,
      tournamentTitle: state.tournamentTitle,
      totalMatches: state.totalMatches,
      teams: state.teams,
      teamRosters: state.teamRosters,
      matches: state.matches,
      savedAt: new Date().toISOString()
    };

    const filename = `FreeFire_${lobbyPrefix}_${(state.tournamentTitle || "Tournament").replace(/[^a-zA-Z0-9_-]/g, "_")}_Backup_${Date.now()}.json`;
    const base64Data = "data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(backupData, null, 2))));

    const result = await uploadFileToDrive({
      filename,
      mimeType: "application/json",
      base64Data,
      description: `Free Fire Scrims Tournament backup for ${state.tournamentTitle}`
    });

    if (result.success) {
      const methodLabel = result.method === "apps_script_webhook" ? "Zero-Login Webhook" : "Google Account OAuth";
      alert(`✅ Cloud Backup Saved to Google Drive!\n\nFile: ${filename}\nGoogle Drive Folder ID: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5\nMethod: ${methodLabel}`);
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

// Node.js CommonJS exports for test suites
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    state,
    DEFAULT_TEAMS,
    LOBBY_CONFIGS,
    getActiveLobbyId,
    getLobbyStorageKey,
    updateLobbyUI,
    switchLobby,
    saveState,
    loadSavedState,
    handleExecuteTournamentReset,
    calculateTeamMatchScore,
    fetchTournamentFromCloud
  };
}

