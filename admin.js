/**
 * =========================================================================
 * JACK SPARROW ESPORTS - SUPER ADMIN CONTROL CENTER
 * Full management for:
 *  1) Users, passwords, roles & per-lobby edit assignments
 *  2) Dynamic lobbies (add, rename, reorder, delete) & admin assignments
 * Strictly guarded by SUPER_ADMIN session + Edge Function verification.
 * =========================================================================
 */

(function () {
  "use strict";

  const loadingState = document.getElementById("admin-loading-state");
  const deniedState = document.getElementById("admin-denied-state");
  const deniedReason = document.getElementById("admin-denied-reason");
  const workspace = document.getElementById("admin-workspace");
  const sessionPill = document.getElementById("admin-session-pill");

  const btnAdminBack = document.getElementById("btn-admin-back");
  const btnDeniedBack = document.getElementById("btn-denied-back");
  const btnAdminLogout = document.getElementById("btn-admin-logout");
  const btnAdminRefresh = document.getElementById("btn-admin-refresh");

  const statusAlert = document.getElementById("admin-status-alert");
  const statusIcon = document.getElementById("admin-status-icon");
  const statusText = document.getElementById("admin-status-text");

  // Workspace Section Tabs
  const tabUsersBtn = document.getElementById("tab-admin-users");
  const tabLobbiesBtn = document.getElementById("tab-admin-lobbies");
  const tabUsersBadge = document.getElementById("tab-users-badge");
  const tabLobbiesBadge = document.getElementById("tab-lobbies-badge");
  const panelUsers = document.getElementById("admin-panel-users");
  const panelLobbies = document.getElementById("admin-panel-lobbies");

  // Panel 1: Users & Assignments
  const createForm = document.getElementById("admin-create-form");
  const newUsernameInput = document.getElementById("admin-new-username");
  const newPasswordInput = document.getElementById("admin-new-password");
  const btnToggleNewPassword = document.getElementById("btn-toggle-new-password");
  const newRoleSelect = document.getElementById("admin-new-role");
  const createLobbiesGroup = document.getElementById("admin-create-lobbies-group");
  const createLobbiesHint = document.getElementById("admin-create-lobbies-hint");
  const createErrorBox = document.getElementById("admin-create-error");
  const btnCreateSubmit = document.getElementById("btn-admin-create-submit");

  const searchInput = document.getElementById("admin-user-search");
  const usersCountEl = document.getElementById("admin-users-count");
  const usersTbody = document.getElementById("admin-users-tbody");

  // Edit User Modal
  const editModalBackdrop = document.getElementById("admin-edit-modal-backdrop");
  const editForm = document.getElementById("admin-edit-form");
  const editUserIdInput = document.getElementById("edit-user-id");
  const editUsernameInput = document.getElementById("edit-user-username");
  const editPasswordInput = document.getElementById("edit-user-password");
  const btnToggleEditPassword = document.getElementById("btn-toggle-edit-password");
  const editRoleSelect = document.getElementById("edit-user-role");
  const editLobbiesGroup = document.getElementById("edit-user-lobbies-group");
  const editLobbiesHint = document.getElementById("edit-user-lobbies-hint");
  const editErrorBox = document.getElementById("admin-edit-error");
  const btnSaveEdit = document.getElementById("btn-save-edit-user");
  const btnCancelEdit = document.getElementById("btn-cancel-edit-user");
  const btnCloseEdit = document.getElementById("btn-close-edit-modal");

  // Delete User Modal
  const deleteModalBackdrop = document.getElementById("admin-delete-modal-backdrop");
  const deleteTargetNameEl = document.getElementById("delete-target-username");
  const deleteErrorBox = document.getElementById("admin-delete-error");
  const btnCancelDelete = document.getElementById("btn-cancel-delete-user");
  const btnCloseDelete = document.getElementById("btn-close-delete-modal");
  const btnConfirmDelete = document.getElementById("btn-confirm-delete-user");

  // Panel 2: Dynamic Lobbies
  const lobbyCreateForm = document.getElementById("admin-lobby-create-form");
  const newLobbyLabelInput = document.getElementById("admin-new-lobby-label");
  const newLobbyTagInput = document.getElementById("admin-new-lobby-tag");
  const newLobbyTitleInput = document.getElementById("admin-new-lobby-title");
  const createLobbyUsersGroup = document.getElementById("admin-create-lobby-users-group");
  const lobbyCreateErrorBox = document.getElementById("admin-lobby-create-error");
  const btnCreateLobbySubmit = document.getElementById("btn-admin-create-lobby");

  const lobbiesCountEl = document.getElementById("admin-lobbies-count");
  const lobbiesTbody = document.getElementById("admin-lobbies-tbody");

  // Edit Lobby Modal
  const lobbyEditModalBackdrop = document.getElementById("admin-lobby-edit-modal-backdrop");
  const lobbyEditForm = document.getElementById("admin-lobby-edit-form");
  const editLobbyIdInput = document.getElementById("edit-lobby-id");
  const editLobbyLabelInput = document.getElementById("edit-lobby-label");
  const editLobbyTagInput = document.getElementById("edit-lobby-tag");
  const editLobbyOrderInput = document.getElementById("edit-lobby-order");
  const editLobbyTitleInput = document.getElementById("edit-lobby-title");
  const editLobbyUsersGroup = document.getElementById("edit-lobby-users-group");
  const lobbyEditErrorBox = document.getElementById("admin-lobby-edit-error");
  const btnSaveEditLobby = document.getElementById("btn-save-edit-lobby");
  const btnCancelEditLobby = document.getElementById("btn-cancel-edit-lobby");
  const btnCloseEditLobby = document.getElementById("btn-close-lobby-edit-modal");

  // Delete Lobby Modal
  const lobbyDeleteModalBackdrop = document.getElementById("admin-lobby-delete-modal-backdrop");
  const deleteTargetLobbyNameEl = document.getElementById("delete-target-lobby-name");
  const deleteTargetLobbyIdEl = document.getElementById("delete-target-lobby-id");
  const lobbyDeleteErrorBox = document.getElementById("admin-lobby-delete-error");
  const btnCancelDeleteLobby = document.getElementById("btn-cancel-delete-lobby");
  const btnCloseDeleteLobby = document.getElementById("btn-close-lobby-delete-modal");
  const btnConfirmDeleteLobby = document.getElementById("btn-confirm-delete-lobby");

  let allUsers = [];
  let allLobbies = [];
  let deleteTargetId = null;
  let deleteTargetLobbyId = null;
  let lastTriggerButton = null;
  let statusBannerTimer = null;

  function applySavedUiTheme() {
    try {
      const saved = localStorage.getItem("jse_ui_theme") || localStorage.getItem("jse_ui_theme_v1") || "blue";
      if (saved === "crimson") {
        document.documentElement.setAttribute("data-ui-theme", "crimson");
      } else {
        document.documentElement.removeAttribute("data-ui-theme");
      }
    } catch (_) {}
  }

  function showStatusBanner(message, type = "success") {
    if (!statusAlert || !statusText || !statusIcon) return;
    statusAlert.className = `match-alert-box ${type === "error" ? "error" : "success"}`;
    statusIcon.textContent = type === "error" ? "⚠️" : "✅";
    statusText.textContent = message;
    statusAlert.style.display = "flex";
    clearTimeout(statusBannerTimer);
    statusBannerTimer = setTimeout(() => {
      if (statusAlert) statusAlert.style.display = "none";
    }, 5500);
  }

  function switchAdminTab(tabName) {
    const showLobbies = tabName === "lobbies";
    if (tabUsersBtn) {
      tabUsersBtn.classList.toggle("active", !showLobbies);
      tabUsersBtn.setAttribute("aria-selected", showLobbies ? "false" : "true");
    }
    if (tabLobbiesBtn) {
      tabLobbiesBtn.classList.toggle("active", showLobbies);
      tabLobbiesBtn.setAttribute("aria-selected", showLobbies ? "true" : "false");
    }
    if (panelUsers) panelUsers.style.display = showLobbies ? "none" : "grid";
    if (panelLobbies) panelLobbies.style.display = showLobbies ? "grid" : "none";
  }

  function formatTimestamp(isoString) {
    if (!isoString) return "Never";
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return "Unknown";
    return dt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getRoleBadgeInfo(role) {
    if (role === "SUPER_ADMIN") {
      return { label: "SUPER ADMIN", cls: "admin-role-pill role-super" };
    }
    if (role === "SCOREKEEPER") {
      return { label: "SCOREKEEPER", cls: "admin-role-pill role-scorekeeper" };
    }
    return { label: "ADMIN", cls: "admin-role-pill role-admin" };
  }

  function getLobbyLabelById(lobbyId) {
    const found = allLobbies.find((l) => l.id === lobbyId);
    return found ? found.label : lobbyId.toUpperCase();
  }

  /**
   * Render interactive checkbox pills inside containerEl.
   * items: Array<{ value, label, subLabel }>
   */
  function renderCheckboxGrid(containerEl, items, selectedValues, emptyMessage, disabled = false) {
    if (!containerEl) return;
    containerEl.innerHTML = "";

    if (!items || items.length === 0) {
      const emptyNote = document.createElement("span");
      emptyNote.className = "admin-check-empty";
      emptyNote.textContent = emptyMessage;
      containerEl.appendChild(emptyNote);
      return;
    }

    const selectedSet = new Set(selectedValues || []);
    items.forEach((item) => {
      const lbl = document.createElement("label");
      lbl.className = `admin-check-pill${disabled ? " is-disabled" : ""}${selectedSet.has(item.value) ? " is-checked" : ""}`;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = item.value;
      cb.checked = selectedSet.has(item.value);
      cb.disabled = disabled;
      cb.addEventListener("change", () => {
        lbl.classList.toggle("is-checked", cb.checked);
      });

      const textSpan = document.createElement("span");
      textSpan.className = "admin-check-label";
      textSpan.textContent = item.label;

      lbl.appendChild(cb);
      lbl.appendChild(textSpan);

      if (item.subLabel) {
        const subSpan = document.createElement("span");
        subSpan.className = "admin-check-sub";
        subSpan.textContent = item.subLabel;
        lbl.appendChild(subSpan);
      }

      containerEl.appendChild(lbl);
    });
  }

  function getCheckedValues(containerEl) {
    if (!containerEl) return [];
    return Array.from(containerEl.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')).map(
      (cb) => cb.value
    );
  }

  function renderLobbyCheckboxesForUserRole(containerEl, hintEl, role, selectedIds) {
    const isSuper = role === "SUPER_ADMIN";
    const items = allLobbies.map((l) => ({
      value: l.id,
      label: l.label,
      subLabel: l.db_tag || l.id
    }));
    renderCheckboxGrid(
      containerEl,
      items,
      isSuper ? allLobbies.map((l) => l.id) : selectedIds,
      "No lobbies configured yet.",
      isSuper
    );
    if (hintEl) {
      hintEl.textContent = isSuper
        ? "👑 Super Admin automatically gets full edit access to ALL current and future lobbies."
        : "Checked lobbies can be edited by this user. Unchecked lobbies remain view-only.";
    }
  }

  function renderUserCheckboxesForLobby(containerEl, selectedUserIds) {
    const assignableUsers = allUsers.filter((u) => u.role !== "SUPER_ADMIN");
    const items = assignableUsers.map((u) => ({
      value: u.id,
      label: u.username,
      subLabel: u.role === "SCOREKEEPER" ? "SK" : "ADMIN"
    }));
    renderCheckboxGrid(
      containerEl,
      items,
      selectedUserIds,
      "No Admin or Scorekeeper accounts yet (create one in Users tab)."
    );
  }

  function renderUsersTable() {
    if (!usersTbody) return;
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const filtered = allUsers.filter((u) => {
      if (!query) return true;
      const lobbyNames = Array.isArray(u.assigned_lobbies)
        ? u.assigned_lobbies.map((id) => (id === "*" ? "all lobbies" : getLobbyLabelById(id))).join(" ")
        : "";
      return (
        String(u.username || "").toLowerCase().includes(query) ||
        String(u.email || "").toLowerCase().includes(query) ||
        String(u.role || "").toLowerCase().includes(query) ||
        lobbyNames.toLowerCase().includes(query)
      );
    });

    if (usersCountEl) usersCountEl.textContent = String(filtered.length);
    if (tabUsersBadge) tabUsersBadge.textContent = String(allUsers.length);

    usersTbody.innerHTML = "";

    if (filtered.length === 0) {
      const emptyTr = document.createElement("tr");
      const emptyTd = document.createElement("td");
      emptyTd.colSpan = 6;
      emptyTd.className = "admin-empty-cell";
      emptyTd.textContent = allUsers.length === 0 ? "No accounts found." : "No matching accounts.";
      emptyTr.appendChild(emptyTd);
      usersTbody.appendChild(emptyTr);
      return;
    }

    filtered.forEach((user, idx) => {
      const tr = document.createElement("tr");

      // # Column
      const tdNum = document.createElement("td");
      tdNum.textContent = String(idx + 1).padStart(2, "0");
      tr.appendChild(tdNum);

      // Username + Email
      const tdUser = document.createElement("td");
      const nameWrap = document.createElement("div");
      nameWrap.className = "admin-user-cell";
      const nameStrong = document.createElement("span");
      nameStrong.className = "admin-user-name";
      nameStrong.textContent = user.username;
      nameWrap.appendChild(nameStrong);
      if (user.is_self) {
        const youTag = document.createElement("span");
        youTag.className = "admin-self-tag";
        youTag.textContent = "YOU";
        nameWrap.appendChild(youTag);
      }
      const emailSub = document.createElement("span");
      emailSub.className = "admin-user-email";
      emailSub.textContent = user.email;
      tdUser.appendChild(nameWrap);
      tdUser.appendChild(emailSub);
      tr.appendChild(tdUser);

      // Role Pill
      const tdRole = document.createElement("td");
      const roleInfo = getRoleBadgeInfo(user.role);
      const rolePill = document.createElement("span");
      rolePill.className = roleInfo.cls;
      rolePill.textContent = roleInfo.label;
      tdRole.appendChild(rolePill);
      tr.appendChild(tdRole);

      // Assigned Lobbies Column
      const tdLobbies = document.createElement("td");
      const lobbyPillWrap = document.createElement("div");
      lobbyPillWrap.className = "admin-lobby-pills";
      if (user.role === "SUPER_ADMIN") {
        const pill = document.createElement("span");
        pill.className = "admin-lobby-chip chip-all";
        pill.textContent = "👑 ALL LOBBIES";
        lobbyPillWrap.appendChild(pill);
      } else if (Array.isArray(user.assigned_lobbies) && user.assigned_lobbies.length > 0) {
        user.assigned_lobbies.forEach((lid) => {
          const pill = document.createElement("span");
          pill.className = "admin-lobby-chip";
          pill.textContent = getLobbyLabelById(lid);
          lobbyPillWrap.appendChild(pill);
        });
      } else {
        const pill = document.createElement("span");
        pill.className = "admin-lobby-chip chip-none";
        pill.textContent = "👁 VIEW ONLY (NONE)";
        lobbyPillWrap.appendChild(pill);
      }
      tdLobbies.appendChild(lobbyPillWrap);
      tr.appendChild(tdLobbies);

      // Last Sign-In
      const tdSign = document.createElement("td");
      tdSign.className = "admin-date-cell";
      tdSign.textContent = formatTimestamp(user.last_sign_in_at);
      tr.appendChild(tdSign);

      // Actions
      const tdActions = document.createElement("td");
      const actionWrap = document.createElement("div");
      actionWrap.className = "admin-row-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-row-btn edit-btn";
      editBtn.textContent = "✏️ EDIT / ASSIGN";
      editBtn.title = `Edit credentials or lobby assignments for ${user.username}`;
      editBtn.addEventListener("click", () => openEditModal(user, editBtn));
      actionWrap.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "admin-row-btn delete-btn";
      deleteBtn.textContent = "🗑️ DELETE";
      if (user.is_self) {
        deleteBtn.disabled = true;
        deleteBtn.title = "Cannot delete your own active Super Admin session";
      } else {
        deleteBtn.title = `Delete account ${user.username}`;
        deleteBtn.addEventListener("click", () => openDeleteModal(user, deleteBtn));
      }
      actionWrap.appendChild(deleteBtn);

      tdActions.appendChild(actionWrap);
      tr.appendChild(tdActions);
      usersTbody.appendChild(tr);
    });
  }

  function renderLobbiesTable() {
    if (!lobbiesTbody) return;
    if (lobbiesCountEl) lobbiesCountEl.textContent = String(allLobbies.length);
    if (tabLobbiesBadge) tabLobbiesBadge.textContent = String(allLobbies.length);

    lobbiesTbody.innerHTML = "";

    if (allLobbies.length === 0) {
      const emptyTr = document.createElement("tr");
      const emptyTd = document.createElement("td");
      emptyTd.colSpan = 5;
      emptyTd.className = "admin-empty-cell";
      emptyTd.textContent = "No lobbies configured yet.";
      emptyTr.appendChild(emptyTd);
      lobbiesTbody.appendChild(emptyTr);
      return;
    }

    const canDelete = allLobbies.length > 1;

    allLobbies.forEach((lobby, idx) => {
      const tr = document.createElement("tr");

      // # Column
      const tdNum = document.createElement("td");
      tdNum.textContent = String(idx + 1).padStart(2, "0");
      tr.appendChild(tdNum);

      // Lobby Label + slug ID
      const tdName = document.createElement("td");
      const nameWrap = document.createElement("div");
      nameWrap.className = "admin-user-cell";
      const nameStrong = document.createElement("span");
      nameStrong.className = "admin-user-name";
      nameStrong.textContent = lobby.label;
      nameWrap.appendChild(nameStrong);
      const idSub = document.createElement("span");
      idSub.className = "admin-user-email";
      idSub.textContent = `ID: ${lobby.id} · Order #${lobby.sort_order}`;
      tdName.appendChild(nameWrap);
      tdName.appendChild(idSub);
      tr.appendChild(tdName);

      // DB Tag & Default Title
      const tdMeta = document.createElement("td");
      const tagBadge = document.createElement("span");
      tagBadge.className = "admin-lobby-chip";
      tagBadge.textContent = lobby.db_tag || "DB";
      const titleSub = document.createElement("span");
      titleSub.className = "admin-user-email";
      titleSub.textContent = lobby.default_title || "";
      tdMeta.appendChild(tagBadge);
      tdMeta.appendChild(titleSub);
      tr.appendChild(tdMeta);

      // Assigned Admins
      const tdAdmins = document.createElement("td");
      const adminsWrap = document.createElement("div");
      adminsWrap.className = "admin-lobby-pills";
      const names = Array.isArray(lobby.assigned_usernames) ? lobby.assigned_usernames : [];
      if (names.length > 0) {
        names.forEach((uname) => {
          const chip = document.createElement("span");
          chip.className = "admin-lobby-chip";
          chip.textContent = uname;
          adminsWrap.appendChild(chip);
        });
      } else {
        const chip = document.createElement("span");
        chip.className = "admin-lobby-chip chip-none";
        chip.textContent = "Super Admin only";
        adminsWrap.appendChild(chip);
      }
      tdAdmins.appendChild(adminsWrap);
      tr.appendChild(tdAdmins);

      // Actions
      const tdActions = document.createElement("td");
      const actionWrap = document.createElement("div");
      actionWrap.className = "admin-row-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-row-btn edit-btn";
      editBtn.textContent = "✏️ EDIT / ASSIGN";
      editBtn.title = `Rename ${lobby.label} or assign admins`;
      editBtn.addEventListener("click", () => openEditLobbyModal(lobby, editBtn));
      actionWrap.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "admin-row-btn delete-btn";
      deleteBtn.textContent = "🗑️ DELETE";
      if (!canDelete) {
        deleteBtn.disabled = true;
        deleteBtn.title = "At least 1 lobby must remain configured";
      } else {
        deleteBtn.title = `Delete ${lobby.label}`;
        deleteBtn.addEventListener("click", () => openDeleteLobbyModal(lobby, deleteBtn));
      }
      actionWrap.appendChild(deleteBtn);

      tdActions.appendChild(actionWrap);
      tr.appendChild(tdActions);
      lobbiesTbody.appendChild(tr);
    });
  }

  function refreshCreateFormsCheckboxes() {
    if (createLobbiesGroup && newRoleSelect) {
      const prevSelected = getCheckedValues(createLobbiesGroup);
      renderLobbyCheckboxesForUserRole(createLobbiesGroup, createLobbiesHint, newRoleSelect.value, prevSelected);
    }
    if (createLobbyUsersGroup) {
      const prevSelectedUsers = getCheckedValues(createLobbyUsersGroup);
      renderUserCheckboxesForLobby(createLobbyUsersGroup, prevSelectedUsers);
    }
  }

  async function loadAdminData(silent = false) {
    if (btnAdminRefresh) btnAdminRefresh.disabled = true;
    if (!silent && usersTbody) {
      usersTbody.innerHTML = '<tr><td colspan="6" class="admin-empty-cell">Loading user accounts...</td></tr>';
    }
    if (!silent && lobbiesTbody) {
      lobbiesTbody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">Loading configured lobbies...</td></tr>';
    }

    const res = await JSEAuth.adminManageUsers({ action: "list" });
    if (btnAdminRefresh) btnAdminRefresh.disabled = false;

    if (!res || !res.success) {
      showStatusBanner((res && res.error) || "Failed to load data from Supabase.", "error");
      if (usersTbody && allUsers.length === 0) {
        usersTbody.innerHTML = '<tr><td colspan="6" class="admin-empty-cell">Unable to load accounts. Click Sync All or re-login.</td></tr>';
      }
      if (lobbiesTbody && allLobbies.length === 0) {
        lobbiesTbody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">Unable to load lobbies. Click Sync All or re-login.</td></tr>';
      }
      return;
    }

    allUsers = Array.isArray(res.users) ? res.users : [];
    allLobbies = Array.isArray(res.lobbies) ? res.lobbies : [];
    renderUsersTable();
    renderLobbiesTable();
    refreshCreateFormsCheckboxes();
  }

  // =========================================================================
  // USER CRUD HANDLERS
  // =========================================================================
  async function handleCreateSubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!newUsernameInput || !newPasswordInput || !newRoleSelect) return;

    const username = newUsernameInput.value.trim();
    const password = newPasswordInput.value;
    const role = newRoleSelect.value;
    const assignedLobbies = role === "SUPER_ADMIN" ? [] : getCheckedValues(createLobbiesGroup);

    if (createErrorBox) createErrorBox.textContent = "";

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      if (createErrorBox) {
        createErrorBox.textContent = "Username must be 3–32 characters (letters, numbers, ., _, -).";
      }
      newUsernameInput.focus();
      return;
    }
    if (!password || password.length < 6) {
      if (createErrorBox) {
        createErrorBox.textContent = "Password must be at least 6 characters.";
      }
      newPasswordInput.focus();
      return;
    }

    if (btnCreateSubmit) {
      btnCreateSubmit.disabled = true;
      const lbl = document.getElementById("btn-create-user-label") || btnCreateSubmit.querySelector("span");
      if (lbl) lbl.textContent = "⏳ CREATING ACCOUNT...";
    }

    const res = await JSEAuth.adminManageUsers({
      action: "create",
      username,
      password,
      role,
      assigned_lobbies: assignedLobbies
    });

    if (btnCreateSubmit) {
      btnCreateSubmit.disabled = false;
      const lbl = document.getElementById("btn-create-user-label") || btnCreateSubmit.querySelector("span");
      if (lbl) lbl.textContent = "➕ CREATE USER ACCOUNT";
    }

    if (!res || !res.success) {
      if (createErrorBox) {
        createErrorBox.textContent = (res && res.error) || "Could not create user account.";
      }
      return;
    }

    newUsernameInput.value = "";
    newPasswordInput.value = "";
    newRoleSelect.value = "TOURNAMENT_ADMIN";
    JSEAuth.resetPasswordToggle(newPasswordInput, btnToggleNewPassword);
    renderLobbyCheckboxesForUserRole(createLobbiesGroup, createLobbiesHint, "TOURNAMENT_ADMIN", []);
    showStatusBanner(`Account "${res.user.username}" (${res.user.role}) created!`, "success");
    await loadAdminData(true);
    newUsernameInput.focus();
  }

  function openEditModal(user, triggerBtn) {
    if (!editModalBackdrop || !user) return;
    lastTriggerButton = triggerBtn || null;
    if (editUserIdInput) editUserIdInput.value = user.id;
    if (editUsernameInput) editUsernameInput.value = user.username;
    if (editPasswordInput) editPasswordInput.value = "";
    JSEAuth.resetPasswordToggle(editPasswordInput, btnToggleEditPassword);
    if (editRoleSelect) {
      editRoleSelect.value = user.role || "TOURNAMENT_ADMIN";
      editRoleSelect.disabled = Boolean(user.is_self);
    }
    const currentAssigned = Array.isArray(user.assigned_lobbies) ? user.assigned_lobbies : [];
    renderLobbyCheckboxesForUserRole(
      editLobbiesGroup,
      editLobbiesHint,
      editRoleSelect ? editRoleSelect.value : user.role,
      currentAssigned
    );
    if (editErrorBox) editErrorBox.textContent = "";

    editModalBackdrop.style.display = "flex";
    setTimeout(() => {
      if (editUsernameInput) {
        editUsernameInput.focus();
        editUsernameInput.select();
      }
    }, 20);
  }

  function closeEditModal() {
    if (!editModalBackdrop) return;
    editModalBackdrop.style.display = "none";
    JSEAuth.resetPasswordToggle(editPasswordInput, btnToggleEditPassword);
    if (lastTriggerButton && typeof lastTriggerButton.focus === "function") {
      lastTriggerButton.focus();
    }
  }

  async function handleEditSubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const userId = editUserIdInput ? editUserIdInput.value : "";
    const username = editUsernameInput ? editUsernameInput.value.trim() : "";
    const password = editPasswordInput ? editPasswordInput.value : "";
    const role = editRoleSelect ? editRoleSelect.value : "TOURNAMENT_ADMIN";
    const assignedLobbies = role === "SUPER_ADMIN" ? [] : getCheckedValues(editLobbiesGroup);

    if (editErrorBox) editErrorBox.textContent = "";

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      if (editErrorBox) editErrorBox.textContent = "Username must be 3–32 characters (letters, numbers, ., _, -).";
      if (editUsernameInput) editUsernameInput.focus();
      return;
    }
    if (password && password.length < 6) {
      if (editErrorBox) editErrorBox.textContent = "New password must be at least 6 characters.";
      if (editPasswordInput) editPasswordInput.focus();
      return;
    }

    if (btnSaveEdit) {
      btnSaveEdit.disabled = true;
      btnSaveEdit.querySelector("span").textContent = "⏳ SAVING...";
    }

    const payload = {
      action: "update",
      userId,
      username,
      role,
      assigned_lobbies: assignedLobbies
    };
    if (password) {
      payload.password = password;
    }

    const res = await JSEAuth.adminManageUsers(payload);

    if (btnSaveEdit) {
      btnSaveEdit.disabled = false;
      btnSaveEdit.querySelector("span").textContent = "💾 SAVE CHANGES";
    }

    if (!res || !res.success) {
      if (editErrorBox) editErrorBox.textContent = (res && res.error) || "Failed to update account.";
      return;
    }

    closeEditModal();
    showStatusBanner(`Account "${res.user.username}" updated successfully.`, "success");
    await loadAdminData(true);
  }

  function openDeleteModal(user, triggerBtn) {
    if (!deleteModalBackdrop || !user || user.is_self) return;
    lastTriggerButton = triggerBtn || null;
    deleteTargetId = user.id;
    if (deleteTargetNameEl) deleteTargetNameEl.textContent = user.username;
    if (deleteErrorBox) deleteErrorBox.textContent = "";
    deleteModalBackdrop.style.display = "flex";
    setTimeout(() => {
      if (btnCancelDelete) btnCancelDelete.focus();
    }, 20);
  }

  function closeDeleteModal() {
    if (!deleteModalBackdrop) return;
    deleteModalBackdrop.style.display = "none";
    deleteTargetId = null;
    if (lastTriggerButton && typeof lastTriggerButton.focus === "function") {
      lastTriggerButton.focus();
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    if (deleteErrorBox) deleteErrorBox.textContent = "";
    if (btnConfirmDelete) {
      btnConfirmDelete.disabled = true;
      btnConfirmDelete.querySelector("span").textContent = "⏳ DELETING...";
    }

    const deletedName = deleteTargetNameEl ? deleteTargetNameEl.textContent : "account";
    const res = await JSEAuth.adminManageUsers({
      action: "delete",
      userId: deleteTargetId
    });

    if (btnConfirmDelete) {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.querySelector("span").textContent = "🗑️ DELETE USER";
    }

    if (!res || !res.success) {
      if (deleteErrorBox) deleteErrorBox.textContent = (res && res.error) || "Failed to delete user.";
      return;
    }

    closeDeleteModal();
    showStatusBanner(`Account "${deletedName}" permanently deleted.`, "success");
    await loadAdminData(true);
  }

  // =========================================================================
  // LOBBY CRUD HANDLERS (ADD, RENAME, DELETE, ASSIGN ADMINS)
  // =========================================================================
  async function handleCreateLobbySubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!newLobbyLabelInput) return;

    const label = newLobbyLabelInput.value.trim().toUpperCase();
    const dbTag = newLobbyTagInput ? newLobbyTagInput.value.trim().toUpperCase() : "";
    const defaultTitle = newLobbyTitleInput ? newLobbyTitleInput.value.trim() : "";
    const assignedUserIds = getCheckedValues(createLobbyUsersGroup);

    if (lobbyCreateErrorBox) lobbyCreateErrorBox.textContent = "";

    if (label.length < 1 || label.length > 32) {
      if (lobbyCreateErrorBox) lobbyCreateErrorBox.textContent = "Lobby tab name is required (1–32 characters).";
      newLobbyLabelInput.focus();
      return;
    }

    if (btnCreateLobbySubmit) {
      btnCreateLobbySubmit.disabled = true;
      const lbl = document.getElementById("btn-create-lobby-label") || btnCreateLobbySubmit.querySelector("span");
      if (lbl) lbl.textContent = "⏳ CREATING LOBBY...";
    }

    const payload = {
      action: "lobby_create",
      label,
      assigned_user_ids: assignedUserIds
    };
    if (dbTag) payload.db_tag = dbTag;
    if (defaultTitle) payload.default_title = defaultTitle;

    const res = await JSEAuth.adminManageUsers(payload);

    if (btnCreateLobbySubmit) {
      btnCreateLobbySubmit.disabled = false;
      const lbl = document.getElementById("btn-create-lobby-label") || btnCreateLobbySubmit.querySelector("span");
      if (lbl) lbl.textContent = "➕ ADD NEW LOBBY";
    }

    if (!res || !res.success) {
      if (lobbyCreateErrorBox) {
        lobbyCreateErrorBox.textContent = (res && res.error) || "Failed to create lobby.";
      }
      return;
    }

    newLobbyLabelInput.value = "";
    if (newLobbyTagInput) newLobbyTagInput.value = "";
    if (newLobbyTitleInput) newLobbyTitleInput.value = "";
    renderUserCheckboxesForLobby(createLobbyUsersGroup, []);
    showStatusBanner(`Lobby "${res.lobby.label}" (${res.lobby.db_tag}) created & synced!`, "success");
    await loadAdminData(true);
    newLobbyLabelInput.focus();
  }

  function openEditLobbyModal(lobby, triggerBtn) {
    if (!lobbyEditModalBackdrop || !lobby) return;
    lastTriggerButton = triggerBtn || null;
    if (editLobbyIdInput) editLobbyIdInput.value = lobby.id;
    if (editLobbyLabelInput) editLobbyLabelInput.value = lobby.label || "";
    if (editLobbyTagInput) editLobbyTagInput.value = lobby.db_tag || "";
    if (editLobbyOrderInput) editLobbyOrderInput.value = String(lobby.sort_order || 1);
    if (editLobbyTitleInput) editLobbyTitleInput.value = lobby.default_title || "";

    renderUserCheckboxesForLobby(editLobbyUsersGroup, Array.isArray(lobby.assigned_user_ids) ? lobby.assigned_user_ids : []);
    if (lobbyEditErrorBox) lobbyEditErrorBox.textContent = "";

    lobbyEditModalBackdrop.style.display = "flex";
    setTimeout(() => {
      if (editLobbyLabelInput) {
        editLobbyLabelInput.focus();
        editLobbyLabelInput.select();
      }
    }, 20);
  }

  function closeEditLobbyModal() {
    if (!lobbyEditModalBackdrop) return;
    lobbyEditModalBackdrop.style.display = "none";
    if (lastTriggerButton && typeof lastTriggerButton.focus === "function") {
      lastTriggerButton.focus();
    }
  }

  async function handleEditLobbySubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const lobbyId = editLobbyIdInput ? editLobbyIdInput.value : "";
    const label = editLobbyLabelInput ? editLobbyLabelInput.value.trim().toUpperCase() : "";
    const dbTag = editLobbyTagInput ? editLobbyTagInput.value.trim().toUpperCase() : "";
    const sortOrder = editLobbyOrderInput ? parseInt(editLobbyOrderInput.value, 10) : undefined;
    const defaultTitle = editLobbyTitleInput ? editLobbyTitleInput.value.trim() : "";
    const assignedUserIds = getCheckedValues(editLobbyUsersGroup);

    if (lobbyEditErrorBox) lobbyEditErrorBox.textContent = "";

    if (label.length < 1 || label.length > 32) {
      if (lobbyEditErrorBox) lobbyEditErrorBox.textContent = "Lobby name must be between 1 and 32 characters.";
      if (editLobbyLabelInput) editLobbyLabelInput.focus();
      return;
    }

    if (btnSaveEditLobby) {
      btnSaveEditLobby.disabled = true;
      btnSaveEditLobby.querySelector("span").textContent = "⏳ SAVING...";
    }

    const res = await JSEAuth.adminManageUsers({
      action: "lobby_update",
      lobby_id: lobbyId,
      label,
      db_tag: dbTag,
      default_title: defaultTitle,
      sort_order: isNaN(sortOrder) ? undefined : sortOrder,
      assigned_user_ids: assignedUserIds
    });

    if (btnSaveEditLobby) {
      btnSaveEditLobby.disabled = false;
      btnSaveEditLobby.querySelector("span").textContent = "💾 SAVE LOBBY";
    }

    if (!res || !res.success) {
      if (lobbyEditErrorBox) lobbyEditErrorBox.textContent = (res && res.error) || "Failed to update lobby.";
      return;
    }

    closeEditLobbyModal();
    showStatusBanner(`Lobby "${res.lobby.label}" updated successfully.`, "success");
    await loadAdminData(true);
  }

  function openDeleteLobbyModal(lobby, triggerBtn) {
    if (!lobbyDeleteModalBackdrop || !lobby) return;
    lastTriggerButton = triggerBtn || null;
    deleteTargetLobbyId = lobby.id;
    if (deleteTargetLobbyNameEl) deleteTargetLobbyNameEl.textContent = lobby.label;
    if (deleteTargetLobbyIdEl) deleteTargetLobbyIdEl.textContent = lobby.id;
    if (lobbyDeleteErrorBox) lobbyDeleteErrorBox.textContent = "";
    lobbyDeleteModalBackdrop.style.display = "flex";
    setTimeout(() => {
      if (btnCancelDeleteLobby) btnCancelDeleteLobby.focus();
    }, 20);
  }

  function closeDeleteLobbyModal() {
    if (!lobbyDeleteModalBackdrop) return;
    lobbyDeleteModalBackdrop.style.display = "none";
    deleteTargetLobbyId = null;
    if (lastTriggerButton && typeof lastTriggerButton.focus === "function") {
      lastTriggerButton.focus();
    }
  }

  async function handleConfirmDeleteLobby() {
    if (!deleteTargetLobbyId) return;
    if (lobbyDeleteErrorBox) lobbyDeleteErrorBox.textContent = "";
    if (btnConfirmDeleteLobby) {
      btnConfirmDeleteLobby.disabled = true;
      btnConfirmDeleteLobby.querySelector("span").textContent = "⏳ DELETING...";
    }

    const deletedName = deleteTargetLobbyNameEl ? deleteTargetLobbyNameEl.textContent : deleteTargetLobbyId;
    const res = await JSEAuth.adminManageUsers({
      action: "lobby_delete",
      lobby_id: deleteTargetLobbyId
    });

    if (btnConfirmDeleteLobby) {
      btnConfirmDeleteLobby.disabled = false;
      btnConfirmDeleteLobby.querySelector("span").textContent = "🗑️ DELETE LOBBY";
    }

    if (!res || !res.success) {
      if (lobbyDeleteErrorBox) lobbyDeleteErrorBox.textContent = (res && res.error) || "Failed to delete lobby.";
      return;
    }

    closeDeleteLobbyModal();
    showStatusBanner(`Lobby "${deletedName}" permanently deleted.`, "success");
    await loadAdminData(true);
  }

  function goBackToScrims() {
    window.location.href = "index.html";
  }

  function initKeyboardSupport() {
    JSEAuth.bindEnterNavigation(createForm, {
      finishSelector: "#btn-admin-create-submit",
      submitOnLastEnter: false
    });
    JSEAuth.bindEnterNavigation(editForm, {
      finishSelector: "#btn-save-edit-user",
      submitOnLastEnter: false
    });
    JSEAuth.bindEnterNavigation(lobbyCreateForm, {
      finishSelector: "#btn-admin-create-lobby",
      submitOnLastEnter: false
    });
    JSEAuth.bindEnterNavigation(lobbyEditForm, {
      finishSelector: "#btn-save-edit-lobby",
      submitOnLastEnter: false
    });

    if (searchInput) {
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const firstEdit = usersTbody ? usersTbody.querySelector(".edit-btn:not([disabled])") : null;
          if (firstEdit) firstEdit.focus();
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      const activeEl = document.activeElement;
      if (e.key === "Escape") {
        if (editModalBackdrop && editModalBackdrop.style.display !== "none") {
          closeEditModal();
        } else if (deleteModalBackdrop && deleteModalBackdrop.style.display !== "none") {
          closeDeleteModal();
        } else if (lobbyEditModalBackdrop && lobbyEditModalBackdrop.style.display !== "none") {
          closeEditLobbyModal();
        } else if (lobbyDeleteModalBackdrop && lobbyDeleteModalBackdrop.style.display !== "none") {
          closeDeleteLobbyModal();
        }
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dialogGroup = activeEl && activeEl.closest ? activeEl.closest(".reset-dialog-actions") : null;
        if (dialogGroup && activeEl.tagName === "BUTTON") {
          const btns = Array.from(dialogGroup.querySelectorAll("button:not([disabled])"));
          const idx = btns.indexOf(activeEl);
          if (idx !== -1 && btns.length > 1) {
            e.preventDefault();
            const nextIdx = (idx + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length;
            btns[nextIdx].focus();
            return;
          }
        }
        const tabStrip = activeEl && activeEl.closest ? activeEl.closest(".admin-section-tabs") : null;
        if (tabStrip && activeEl.classList.contains("admin-section-tab-btn")) {
          const tabs = [tabUsersBtn, tabLobbiesBtn].filter(Boolean);
          const idx = tabs.indexOf(activeEl);
          if (idx !== -1 && tabs.length > 1) {
            e.preventDefault();
            const nextTab = tabs[(idx + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
            nextTab.focus();
            switchAdminTab(nextTab === tabLobbiesBtn ? "lobbies" : "users");
          }
        }
      }
    });
  }

  async function initAdminPage() {
    applySavedUiTheme();

    if (btnAdminBack) btnAdminBack.addEventListener("click", goBackToScrims);
    if (btnDeniedBack) btnDeniedBack.addEventListener("click", goBackToScrims);
    if (btnAdminLogout) {
      btnAdminLogout.addEventListener("click", async () => {
        if (typeof JSEAuth !== "undefined") await JSEAuth.logout();
        goBackToScrims();
      });
    }

    if (typeof JSEAuth === "undefined" || typeof JSEAuth.checkSession !== "function") {
      if (loadingState) loadingState.style.display = "none";
      if (deniedState) deniedState.style.display = "block";
      return;
    }

    const activeUser = await JSEAuth.checkSession();
    if (!activeUser || !activeUser.username) {
      goBackToScrims();
      return;
    }

    if (sessionPill) {
      sessionPill.textContent = `${activeUser.username} (${activeUser.role})`;
    }

    if (loadingState) loadingState.style.display = "none";

    if (!JSEAuth.hasPermission("MANAGE_CREDENTIALS")) {
      if (deniedReason) {
        deniedReason.textContent = `Signed in as "${activeUser.username}" (${activeUser.role}). Only Super Admin (Js.Suzie) can manage users and lobbies.`;
      }
      if (deniedState) deniedState.style.display = "block";
      if (btnDeniedBack) btnDeniedBack.focus();
      return;
    }

    if (workspace) workspace.style.display = "block";

    JSEAuth.bindPasswordToggle(newPasswordInput, btnToggleNewPassword);
    JSEAuth.bindPasswordToggle(editPasswordInput, btnToggleEditPassword);

    if (tabUsersBtn) tabUsersBtn.addEventListener("click", () => switchAdminTab("users"));
    if (tabLobbiesBtn) tabLobbiesBtn.addEventListener("click", () => switchAdminTab("lobbies"));

    if (newRoleSelect) {
      newRoleSelect.addEventListener("change", () => {
        const selected = getCheckedValues(createLobbiesGroup);
        renderLobbyCheckboxesForUserRole(createLobbiesGroup, createLobbiesHint, newRoleSelect.value, selected);
      });
    }
    if (editRoleSelect) {
      editRoleSelect.addEventListener("change", () => {
        const selected = getCheckedValues(editLobbiesGroup);
        renderLobbyCheckboxesForUserRole(editLobbiesGroup, editLobbiesHint, editRoleSelect.value, selected);
      });
    }

    if (createForm) createForm.addEventListener("submit", handleCreateSubmit);
    if (searchInput) searchInput.addEventListener("input", renderUsersTable);
    if (btnAdminRefresh) btnAdminRefresh.addEventListener("click", () => loadAdminData(false));

    if (editForm) editForm.addEventListener("submit", handleEditSubmit);
    if (btnCancelEdit) btnCancelEdit.addEventListener("click", closeEditModal);
    if (btnCloseEdit) btnCloseEdit.addEventListener("click", closeEditModal);
    if (editModalBackdrop) {
      editModalBackdrop.addEventListener("click", (e) => {
        if (e.target === editModalBackdrop) closeEditModal();
      });
    }

    if (btnCancelDelete) btnCancelDelete.addEventListener("click", closeDeleteModal);
    if (btnCloseDelete) btnCloseDelete.addEventListener("click", closeDeleteModal);
    if (btnConfirmDelete) btnConfirmDelete.addEventListener("click", handleConfirmDelete);
    if (deleteModalBackdrop) {
      deleteModalBackdrop.addEventListener("click", (e) => {
        if (e.target === deleteModalBackdrop) closeDeleteModal();
      });
    }

    if (lobbyCreateForm) lobbyCreateForm.addEventListener("submit", handleCreateLobbySubmit);
    if (lobbyEditForm) lobbyEditForm.addEventListener("submit", handleEditLobbySubmit);
    if (btnCancelEditLobby) btnCancelEditLobby.addEventListener("click", closeEditLobbyModal);
    if (btnCloseEditLobby) btnCloseEditLobby.addEventListener("click", closeEditLobbyModal);
    if (lobbyEditModalBackdrop) {
      lobbyEditModalBackdrop.addEventListener("click", (e) => {
        if (e.target === lobbyEditModalBackdrop) closeEditLobbyModal();
      });
    }

    if (btnCancelDeleteLobby) btnCancelDeleteLobby.addEventListener("click", closeDeleteLobbyModal);
    if (btnCloseDeleteLobby) btnCloseDeleteLobby.addEventListener("click", closeDeleteLobbyModal);
    if (btnConfirmDeleteLobby) btnConfirmDeleteLobby.addEventListener("click", handleConfirmDeleteLobby);
    if (lobbyDeleteModalBackdrop) {
      lobbyDeleteModalBackdrop.addEventListener("click", (e) => {
        if (e.target === lobbyDeleteModalBackdrop) closeDeleteLobbyModal();
      });
    }

    initKeyboardSupport();
    await loadAdminData(false);

    if (newUsernameInput && typeof newUsernameInput.focus === "function") {
      newUsernameInput.focus();
    }
  }

  document.addEventListener("DOMContentLoaded", initAdminPage);
})();
