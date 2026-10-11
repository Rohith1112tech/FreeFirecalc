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

function calculateTeamMatchScore(placement, kills) {
  const placePts = getPlacementPoints(placement);
  const killPts = getKillPoints(kills);
  return {
    placementPoints: placePts,
    killPoints: killPts,
    totalPoints: placePts + killPts // Total = Placement Points + Kill Points
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
  activeScreen: "setup", // 'setup' | 'tournament'
  activeSubView: "view-match-input", // 'view-match-input' | 'view-leaderboard' | 'view-matrix'
  positionDisplayMode: "points", // 'points' (Cumulative Placement Points) | 'average' (Average Placement Rank)
  exportFormat: "png", // 'png' | 'jpg'
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

// Prominent Bottom Export Controls (Prompt 5)
const btnDownloadResultsBottom = document.getElementById("btn-download-results-bottom");
const downloadResultsBtnText = document.getElementById("download-results-btn-text");
const exportStatusMessage = document.getElementById("export-status-message");
const btnFormatPng = document.getElementById("btn-format-png");
const btnFormatJpg = document.getElementById("btn-format-jpg");

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

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  loadSavedState();
  initMatchesState();
  renderTeamInputs();
  bindEvents();
  updateFilledCount();

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
            kills: 0
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
          kills: 0
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
 * Render the 12 Team Input Cards in setup screen
 */
function renderTeamInputs() {
  teamsInputContainer.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const slotNumber = String(i + 1).padStart(2, "0");
    const currentVal = state.teams[i] || "";

    const slotCard = document.createElement("div");
    slotCard.className = "team-slot-card";

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
    input.placeholder = `TEAM ${slotNumber}`;
    input.value = currentVal;
    input.maxLength = 30;

    input.addEventListener("input", (e) => {
      state.teams[i] = e.target.value.trim();
      updateFilledCount();
      clearError();
    });

    inputWrap.appendChild(input);
    slotCard.appendChild(badge);
    slotCard.appendChild(inputWrap);
    teamsInputContainer.appendChild(slotCard);
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

  // Download Results & Poster as Image (Prompt 5)
  if (btnDownloadResultsBottom) {
    btnDownloadResultsBottom.addEventListener("click", () => {
      handleExportResults(state.exportFormat || "png");
    });
  }

  if (btnDownloadPoster) {
    btnDownloadPoster.addEventListener("click", () => {
      handleExportResults(state.exportFormat || "png");
    });
  }

  if (btnFormatPng && btnFormatJpg) {
    btnFormatPng.addEventListener("click", () => {
      state.exportFormat = "png";
      btnFormatPng.classList.add("active");
      btnFormatJpg.classList.remove("active");
      if (btnDownloadPoster) {
        btnDownloadPoster.innerHTML = `<span>📸 DOWNLOAD POSTER (PNG)</span>`;
      }
    });

    btnFormatJpg.addEventListener("click", () => {
      state.exportFormat = "jpg";
      btnFormatJpg.classList.add("active");
      btnFormatPng.classList.remove("active");
      if (btnDownloadPoster) {
        btnDownloadPoster.innerHTML = `<span>📸 DOWNLOAD POSTER (JPG)</span>`;
      }
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

  // Validate 12 teams
  const inputs = teamsInputContainer.querySelectorAll(".team-name-input");
  const emptyIndices = [];
  const teamNames = [];

  inputs.forEach((input, idx) => {
    const val = input.value.trim();
    if (!val) {
      emptyIndices.push(idx + 1);
    } else {
      teamNames.push(val);
    }
  });

  if (emptyIndices.length > 0) {
    showError(`Please fill in all 12 team names. Missing slot(s): #${emptyIndices.join(", #")}`);
    const firstEmpty = inputs[emptyIndices[0] - 1];
    if (firstEmpty) firstEmpty.focus();
    return;
  }

  // Check for duplicate team names
  const uniqueNames = new Set(teamNames.map((n) => n.toUpperCase()));
  if (uniqueNames.size !== 12) {
    showError("Each team name must be unique. Please resolve duplicate team names.");
    return;
  }

  state.teams = teamNames;
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
 * Render the 12 Team Forms for the selected match (Prompt 2 & 3)
 */
function renderMatchTeamForms() {
  matchTeamsGridContainer.innerHTML = "";
  const currentMatch = state.matches[state.selectedMatchIndex];
  if (!currentMatch) return;

  state.teams.forEach((teamName, teamIdx) => {
    const slotNumber = String(teamIdx + 1).padStart(2, "0");
    const existing = (currentMatch.teamData && currentMatch.teamData[teamIdx]) || {
      placement: "",
      kills: 0
    };

    const score = calculateTeamMatchScore(existing.placement, existing.kills);

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

    const ptsPreview = document.createElement("div");
    ptsPreview.className = "team-pts-preview";
    ptsPreview.id = `pts-preview-${teamIdx}`;
    ptsPreview.innerHTML = `PTS: <b id="pts-val-${teamIdx}">${score.totalPoints}</b> <span style="font-size:0.75rem;opacity:0.85;margin-left:4px;">(${score.placementPoints} Place + ${score.killPoints} Kills)</span>`;

    cardHeader.appendChild(metaGroup);
    cardHeader.appendChild(ptsPreview);

    // Card Inputs Row: Placement select (1-12) and Kills number input
    const inputsRow = document.createElement("div");
    inputsRow.className = "card-inputs-row";

    // Placement Field
    const placementBlock = document.createElement("div");
    placementBlock.className = "field-block";

    const placementLabel = document.createElement("label");
    placementLabel.textContent = "PLACEMENT (1-12)";

    const placementSelect = document.createElement("select");
    placementSelect.className = "placement-select";
    placementSelect.dataset.teamIndex = teamIdx;
    placementSelect.innerHTML = `<option value="">-- Select Placement --</option>`;

    for (let p = 1; p <= 12; p++) {
      const pts = PLACEMENT_POINTS[p];
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
      if (!currentMatch.teamData[teamIdx]) currentMatch.teamData[teamIdx] = { teamName, kills: 0 };
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
      if (!currentMatch.teamData[teamIdx]) currentMatch.teamData[teamIdx] = { teamName, placement: "" };
      currentMatch.teamData[teamIdx].kills = val;

      updateCardPointsPreview(teamIdx);
    });

    killsWrap.appendChild(killsInput);
    killsBlock.appendChild(killsLabel);
    killsBlock.appendChild(killsWrap);

    inputsRow.appendChild(placementBlock);
    inputsRow.appendChild(killsBlock);

    card.appendChild(cardHeader);
    card.appendChild(inputsRow);

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
  const score = calculateTeamMatchScore(data.placement, data.kills);
  const ptsPreviewEl = document.getElementById(`pts-preview-${teamIdx}`);
  if (ptsPreviewEl) {
    ptsPreviewEl.innerHTML = `PTS: <b id="pts-val-${teamIdx}">${score.totalPoints}</b> <span style="font-size:0.75rem;opacity:0.85;margin-left:4px;">(${score.placementPoints} Place + ${score.killPoints} Kills)</span>`;
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
    showMatchAlert(`Duplicate placement detected: ${dupList}. Placements must be unique for all 12 teams!`, "error");
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

  // 1. Check for missing placements
  const unplacedTeams = [];
  currentMatch.teamData.forEach((t, idx) => {
    if (t.placement === "" || t.placement === null || t.placement === undefined) {
      unplacedTeams.push(state.teams[idx]);
    }
  });

  if (unplacedTeams.length > 0) {
    showMatchAlert(`Please assign a placement (1-12) to all 12 teams before saving. Missing: ${unplacedTeams.slice(0, 3).join(", ")}${unplacedTeams.length > 3 ? "..." : ""}`, "error");
    return;
  }

  // 2. Check for duplicate placements
  const conflictCheck = checkPlacementConflicts();
  if (conflictCheck.hasConflict) {
    showMatchAlert(`Cannot save: Placements must be unique for all 12 teams! Found duplicate(s): ${conflictCheck.duplicates.map((p) => `#${p}`).join(", ")}`, "error");
    return;
  }

  // 3. Normalize kills
  currentMatch.teamData.forEach((t) => {
    const k = parseInt(t.kills, 10);
    t.kills = isNaN(k) || k < 0 ? 0 : k;
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
    showMatchAlert(`Match ${matchNum} corrected successfully! Cumulative totals, leaderboards, and tie-breakers have been recalculated.`, "success");
  } else {
    showMatchAlert(`Match ${matchNum} data saved successfully! Standings and cumulative scores updated.`, "success");
  }
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
        kills: 0
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
          const score = calculateTeamMatchScore(p, teamMatchData.kills);

          teamStat.matchesPlayed += 1;
          teamStat.placementPoints += score.placementPoints;
          teamStat.eliminationPoints += score.killPoints;
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

  // Official Prompt 8 Strict Tie-Breaker Sorting Hierarchy:
  // 1. Primary: Cumulative Total Points (Highest first)
  // 2. Tie-breaker 1: Higher cumulative Kill Points (Eliminations)
  // 3. Tie-breaker 2: If kills are also tied, the team with the most Booyahs (1st place finishes) breaks the tie
  // 4. Sub-fallback: Cumulative placement points
  stats.sort((a, b) => {
    // Rule 1: Total Points
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // Rule 2 (Tie-breaker 1): Higher cumulative Kill Points
    if (b.eliminationPoints !== a.eliminationPoints) {
      return b.eliminationPoints - a.eliminationPoints;
    }
    // Rule 3 (Tie-breaker 2): Most Booyahs (1st place finishes)
    if (b.booyahs !== a.booyahs) {
      return b.booyahs - a.booyahs;
    }
    // Sub-fallback: Placement Points
    return b.placementPoints - a.placementPoints;
  });

  return stats;
}

/**
 * Animate a numeric element counting up dynamically from 0 to target
 */
function animateCountUp(element, target, duration = 800) {
  const targetNum = parseInt(target, 10);
  if (isNaN(targetNum) || targetNum <= 0) {
    element.textContent = "0";
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

    // 2. Position Column (placement points or avg placement)
    const posValEl = document.createElement("span");
    posValEl.className = "overlay-position-val";
    posValEl.textContent = state.positionDisplayMode === "average" ? t.averagePlacement : t.placementPoints;

    // 3. Elimination Column (total cumulative kills)
    const elimValEl = document.createElement("span");
    elimValEl.className = "overlay-elimination-val";
    elimValEl.textContent = t.eliminationPoints;

    // 4. Total Column (centered directly in right red badge with count-up)
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
            <span class="match-cell-sub">#${matchScore.placement} (${matchScore.kills}k)</span>
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
async function handleExportResults(format = "png") {
  const btnTextEl = document.getElementById("download-results-btn-text");
  const originalText = btnTextEl ? btnTextEl.textContent : "DOWNLOAD RESULTS";

  // Visual Loading Feedback
  if (btnTextEl) btnTextEl.textContent = `GENERATING (${format.toUpperCase()})...`;
  if (btnDownloadResultsBottom) btnDownloadResultsBottom.classList.add("downloading");
  if (btnDownloadPoster) btnDownloadPoster.innerHTML = `<span>⏳ EXPORTING (${format.toUpperCase()})...</span>`;
  if (exportStatusMessage) exportStatusMessage.textContent = `⏳ Rendering pixel-perfect HD results onto template image...`;

  const safeTitle = (state.tournamentTitle || "Tournament").replace(/[^a-zA-Z0-9_-]/g, "_");
  const ext = format === "jpg" ? "jpg" : "png";
  const filename = `FreeFire_${safeTitle}_Leaderboard_${Date.now()}.${ext}`;

  try {
    fallbackCanvasExport(format, filename);
  } catch (err) {
    console.error("Export error:", err);
    if (exportStatusMessage) {
      exportStatusMessage.textContent = `⚠️ Error generating image. Please try again.`;
    }
  } finally {
    // Reset button states
    if (btnTextEl) btnTextEl.textContent = originalText;
    if (btnDownloadResultsBottom) btnDownloadResultsBottom.classList.remove("downloading");
    if (btnDownloadPoster) btnDownloadPoster.innerHTML = `<span>📸 DOWNLOAD POSTER (${format.toUpperCase()})</span>`;
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
 * Built-in Canvas Export: Renders 100% pixel-perfect text onto the exact template graphic
 */
function fallbackCanvasExport(format = "png", filename = "FreeFire_Leaderboard.png") {
  const cumulativeStats = calculateCumulativeStats();
  const templateImg = document.getElementById("poster-template-bg");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  function drawDataAndDownload(img) {
    // 2x Retina Resolution (850 x 1024)
    canvas.width = (img.naturalWidth || 425) * 2;
    canvas.height = (img.naturalHeight || 512) * 2;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Exact measured vertical centers of all 12 slots in the 512px template
    const slotCenters512 = [189, 212, 234, 256.5, 279, 301.5, 324, 346.5, 369.5, 392, 414.5, 437.5];
    const rowHeight = (canvas.height * (272 / 512)) / 12;

    // Pre-calculate fonts (scaled for retina sharpness, adjusted to fit slot height)
    const crownFontSize = Math.round(canvas.width * 0.021);
    const teamFontSize = Math.round(canvas.width * 0.023);
    const posFontSize = Math.round(canvas.width * 0.024);
    const totalFontSize = Math.round(canvas.width * 0.027);

    cumulativeStats.forEach((t, i) => {
      // Dead-center vertical coordinate for each slot
      const rowCenterY = canvas.height * (slotCenters512[i] / 512);
      const rank = i + 1;

      // Crown on Rank 1 (#01)
      if (rank === 1) {
        ctx.font = `bold ${crownFontSize}px sans-serif`;
        ctx.fillStyle = "#ffeb3b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👑", canvas.width * 0.108, rowCenterY - rowHeight * 0.40);
      }

      // 1. Team Name (Inside brushed metal slot: x = 17.5%)
      ctx.font = `bold ${teamFontSize}px "Chakra Petch", "Rajdhani", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      // Shadow for high contrast
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Truncate name if too long for the slot
      let displayName = t.teamName.toUpperCase();
      const maxTextWidth = canvas.width * 0.32;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, canvas.width * 0.178, rowCenterY);

      // Reset shadow for numbers
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 2. Position Column (Placement points or avg rank)
      ctx.font = `bold ${posFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#93c5fd";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(147, 197, 253, 0.7)";
      ctx.shadowBlur = 6;
      const posText = state.positionDisplayMode === "average" ? String(t.averagePlacement) : String(t.placementPoints);
      ctx.fillText(posText, canvas.width * 0.575, rowCenterY);

      // 3. Elimination Column (Cumulative kills)
      ctx.fillStyle = "#fca5a5";
      ctx.shadowColor = "rgba(252, 165, 165, 0.7)";
      ctx.shadowBlur = 6;
      ctx.fillText(String(t.eliminationPoints), canvas.width * 0.722, rowCenterY);

      // 4. Total Column (Right red trapezoid badge)
      ctx.font = `900 ${totalFontSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(255, 23, 68, 0.9)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(t.totalPoints), canvas.width * 0.880, rowCenterY);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });

    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    triggerFileDownload(canvas.toDataURL(mime, 0.95), filename);
    if (exportStatusMessage) {
      exportStatusMessage.textContent = `✅ Results poster saved successfully (${format.toUpperCase()})!`;
      setTimeout(() => {
        if (exportStatusMessage) exportStatusMessage.textContent = "⚡ High-Definition 2x capture perfectly aligned";
      }, 5000);
    }
  }

  if (templateImg && templateImg.complete && templateImg.naturalWidth > 0) {
    drawDataAndDownload(templateImg);
  } else {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => drawDataAndDownload(img);
    img.src = "assets/jack_sparrow_template.png";
  }
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
  state.exportFormat = "png";
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
      activeScreen: state.activeScreen,
      activeSubView: state.activeSubView,
      selectedMatchIndex: state.selectedMatchIndex,
      positionDisplayMode: state.positionDisplayMode,
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
      if (Array.isArray(parsed.teams) && parsed.teams.length === 12) state.teams = parsed.teams;
      if (parsed.activeScreen) state.activeScreen = parsed.activeScreen;
      if (parsed.activeSubView) state.activeSubView = parsed.activeSubView;
      if (parsed.selectedMatchIndex !== undefined) state.selectedMatchIndex = parsed.selectedMatchIndex;
      if (parsed.positionDisplayMode) state.positionDisplayMode = parsed.positionDisplayMode;
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
