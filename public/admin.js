/**
 * =========================================================================
 * JACK SPARROW ESPORTS - SUPER ADMIN USER & PASSWORD MANAGER
 * Dedicated administrative console for creating, renaming, resetting
 * passwords, changing roles, and deleting Supabase Auth accounts.
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

  const createForm = document.getElementById("admin-create-form");
  const newUsernameInput = document.getElementById("admin-new-username");
  const newPasswordInput = document.getElementById("admin-new-password");
  const btnToggleNewPassword = document.getElementById("btn-toggle-new-password");
  const newRoleSelect = document.getElementById("admin-new-role");
  const createErrorBox = document.getElementById("admin-create-error");
  const btnCreateSubmit = document.getElementById("btn-admin-create-submit");

  const searchInput = document.getElementById("admin-user-search");
  const usersCountEl = document.getElementById("admin-users-count");
  const usersTbody = document.getElementById("admin-users-tbody");

  const editModalBackdrop = document.getElementById("admin-edit-modal-backdrop");
  const editForm = document.getElementById("admin-edit-form");
  const editUserIdInput = document.getElementById("edit-user-id");
  const editUsernameInput = document.getElementById("edit-user-username");
  const editPasswordInput = document.getElementById("edit-user-password");
  const btnToggleEditPassword = document.getElementById("btn-toggle-edit-password");
  const editRoleSelect = document.getElementById("edit-user-role");
  const editErrorBox = document.getElementById("admin-edit-error");
  const btnSaveEdit = document.getElementById("btn-save-edit-user");
  const btnCancelEdit = document.getElementById("btn-cancel-edit-user");
  const btnCloseEdit = document.getElementById("btn-close-edit-modal");

  const deleteModalBackdrop = document.getElementById("admin-delete-modal-backdrop");
  const deleteTargetNameEl = document.getElementById("delete-target-username");
  const deleteErrorBox = document.getElementById("admin-delete-error");
  const btnCancelDelete = document.getElementById("btn-cancel-delete-user");
  const btnCloseDelete = document.getElementById("btn-close-delete-modal");
  const btnConfirmDelete = document.getElementById("btn-confirm-delete-user");

  let allUsers = [];
  let deleteTargetId = null;
  let lastTriggerButton = null;
  let statusBannerTimer = null;

  function applySavedUiTheme() {
    try {
      const saved = localStorage.getItem("jse_ui_theme_v1") || "cyber-blue";
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
    }, 5000);
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

  function renderUsersTable() {
    if (!usersTbody) return;
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const filtered = allUsers.filter((u) => {
      if (!query) return true;
      return (
        String(u.username || "").toLowerCase().includes(query) ||
        String(u.email || "").toLowerCase().includes(query) ||
        String(u.role || "").toLowerCase().includes(query)
      );
    });

    if (usersCountEl) {
      usersCountEl.textContent = String(filtered.length);
    }

    usersTbody.innerHTML = "";

    if (filtered.length === 0) {
      const emptyTr = document.createElement("tr");
      const emptyTd = document.createElement("td");
      emptyTd.colSpan = 5;
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
      editBtn.textContent = "✏️ EDIT / PASS";
      editBtn.title = `Edit username or reset password for ${user.username}`;
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

  async function loadUsersList(silent = false) {
    if (btnAdminRefresh) btnAdminRefresh.disabled = true;
    if (!silent && usersTbody) {
      usersTbody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">Loading user accounts...</td></tr>';
    }
    const res = await JSEAuth.adminManageUsers({ action: "list" });
    if (btnAdminRefresh) btnAdminRefresh.disabled = false;

    if (!res || !res.success) {
      showStatusBanner((res && res.error) || "Failed to load accounts from Supabase.", "error");
      if (usersTbody && allUsers.length === 0) {
        usersTbody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">Unable to load accounts. Click Refresh or re-login.</td></tr>';
      }
      return;
    }

    allUsers = Array.isArray(res.users) ? res.users : [];
    renderUsersTable();
  }

  async function handleCreateSubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!newUsernameInput || !newPasswordInput || !newRoleSelect) return;

    const username = newUsernameInput.value.trim();
    const password = newPasswordInput.value;
    const role = newRoleSelect.value;

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
      role
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
    showStatusBanner(`Account "${res.user.username}" (${res.user.role}) created! They can log in immediately.`, "success");
    await loadUsersList(true);
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
      role
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

    const actionSummary = password ? "username/password updated" : "account details updated";
    closeEditModal();
    showStatusBanner(`Account "${res.user.username}" — ${actionSummary}.`, "success");
    await loadUsersList(true);
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
    await loadUsersList(true);
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
        }
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const group = activeEl && activeEl.closest ? activeEl.closest(".reset-dialog-actions") : null;
        if (group && activeEl.tagName === "BUTTON") {
          const btns = Array.from(group.querySelectorAll("button:not([disabled])"));
          const idx = btns.indexOf(activeEl);
          if (idx !== -1 && btns.length > 1) {
            e.preventDefault();
            const nextIdx = (idx + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length;
            btns[nextIdx].focus();
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
        deniedReason.textContent = `Signed in as "${activeUser.username}" (${activeUser.role}). Only Super Admin (Js.Suzie) can access user & password management.`;
      }
      if (deniedState) deniedState.style.display = "block";
      if (btnDeniedBack) btnDeniedBack.focus();
      return;
    }

    if (workspace) workspace.style.display = "block";

    JSEAuth.bindPasswordToggle(newPasswordInput, btnToggleNewPassword);
    JSEAuth.bindPasswordToggle(editPasswordInput, btnToggleEditPassword);

    if (createForm) createForm.addEventListener("submit", handleCreateSubmit);
    if (searchInput) searchInput.addEventListener("input", renderUsersTable);
    if (btnAdminRefresh) btnAdminRefresh.addEventListener("click", () => loadUsersList(false));

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

    initKeyboardSupport();
    await loadUsersList(false);

    if (newUsernameInput && typeof newUsernameInput.focus === "function") {
      newUsernameInput.focus();
    }
  }

  document.addEventListener("DOMContentLoaded", initAdminPage);
})();
