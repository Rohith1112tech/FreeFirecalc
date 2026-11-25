/**
 * =========================================================================
 * JACK SPARROW ESPORTS - CLIENT AUTHENTICATION & ACCESS CONTROL CONTROLLER
 * Zero-Secret Public Client: All authentication is strictly verified server-side.
 * Communicates with Netlify Serverless Function or Node.js Backend API.
 * Uses Secure, HttpOnly, SameSite cookies & Server-Validated Sessions.
 * =========================================================================
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    // Node.js environment: delegate to server_auth module
    module.exports = factory(require("./server_auth"));
  } else {
    // Browser environment: zero secrets, server-driven authentication
    root.JSEAuth = factory(null);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (serverAuth) {
  "use strict";

  // Role Definitions (Consistent with backend RBAC)
  const ROLES = Object.freeze({
    SUPER_ADMIN: "SUPER_ADMIN",
    TOURNAMENT_ADMIN: "TOURNAMENT_ADMIN",
    SCOREKEEPER: "SCOREKEEPER",
    PUBLIC: "PUBLIC"
  });

  // Client UI Permissions Matrix (For UI element visibility only; backend strictly enforces authorization)
  const PERMISSIONS = Object.freeze({
    RESET_TOURNAMENT: [ROLES.SUPER_ADMIN],
    CONFIG_TOURNAMENT: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN],
    MANAGE_TEAMS: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN],
    RECORD_SCORES: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN, ROLES.SCOREKEEPER],
    IMPORT_MATCHES: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN, ROLES.SCOREKEEPER],
    CLOUD_BACKUP: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN, ROLES.SCOREKEEPER],
    CLOUD_RESTORE: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN],
    MANAGE_CREDENTIALS: [ROLES.SUPER_ADMIN],
    VIEW_RESULTS: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN, ROLES.SCOREKEEPER, ROLES.PUBLIC]
  });

  // If in Node.js server environment, expose serverAuth capabilities directly
  if (serverAuth) {
    let mockActiveSession = null;

    return {
      ROLES,
      PERMISSIONS,
      hashPassword: serverAuth.hashPassword,
      verifyPassword: serverAuth.verifyPassword,
      login: async (username, password) => {
        const res = serverAuth.handleLogin(username, password);
        if (res.success) {
          mockActiveSession = {
            username: res.user.username,
            role: res.user.role,
            displayName: res.user.displayName,
            token: res.token,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000
          };
          return { success: true, session: mockActiveSession, token: res.token };
        }
        return { success: false, error: res.error };
      },
      logout: () => {
        mockActiveSession = null;
        return { success: true };
      },
      getActiveSession: () => mockActiveSession,
      getCurrentRole: () => (mockActiveSession ? mockActiveSession.role : ROLES.PUBLIC),
      hasPermission: (action, role) => {
        const allowed = PERMISSIONS[action];
        return Array.isArray(allowed) && allowed.includes(role || ROLES.PUBLIC);
      },
      enforcePermission: (action, role) => {
        const allowed = PERMISSIONS[action];
        if (!allowed || !allowed.includes(role || ROLES.PUBLIC)) {
          throw new Error(`Access Denied: Action '${action}' requires elevated permissions.`);
        }
        return true;
      },
      resetSuperAdminPasswordWithRecoveryKey: serverAuth.resetSuperAdminPasswordWithRecoveryKey,
      getLockoutState: (username) => ({
        isLockedOut: serverAuth.isLockedOut(username)
      })
    };
  }

  // =========================================================================
  // BROWSER CLIENT-SIDE IMPLEMENTATION (ZERO PASSWORDS, ZERO HASHES)
  // Primary: Supabase Auth (ff-scrims); Fallback: Server / Netlify Function
  // =========================================================================

  const SUPABASE_URL = "https://fajjslwudnzpvwywotbi.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iJH3YL62yZSc5yO4U1knFQ_2E-jlwd9";

  let supabaseClientInstance = null;
  let inMemoryUser = null;
  let inMemoryToken = null;

  function getSupabaseClient() {
    if (supabaseClientInstance) return supabaseClientInstance;
    if (
      typeof window !== "undefined" &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
    ) {
      supabaseClientInstance = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        }
      );
      return supabaseClientInstance;
    }
    return null;
  }

  function resolveSupabaseLoginEmail(username) {
    const clean = String(username || "").trim().toLowerCase();
    if (!clean) return "";
    if (clean.includes("@")) return clean;
    return `${clean}@ffscrims.app`;
  }

  function mapSupabaseUser(sbUser) {
    if (!sbUser) return null;
    // Security rule: Read role strictly from immutable app_metadata, NEVER user_metadata
    const appMeta = sbUser.app_metadata || {};
    const resolvedRole = ROLES[appMeta.role] || ROLES.PUBLIC;
    const rawEmail = sbUser.email || "";
    const resolvedUsername = appMeta.username || (rawEmail ? rawEmail.split("@")[0] : "Admin");
    return {
      id: sbUser.id,
      email: rawEmail,
      username: resolvedUsername,
      role: resolvedRole,
      displayName: resolvedUsername,
      provider: "supabase"
    };
  }

  function getAuthEndpoint() {
    if (typeof window !== "undefined") {
      const origin = window.location.origin || "";
      const port = window.location.port || "";
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        if (port === "8888") {
          return "/.netlify/functions/auth";
        }
        return "/api/auth";
      }
    }
    return "/.netlify/functions/auth";
  }

  async function fetchAuthEndpoint(options) {
    const primary = getAuthEndpoint();
    let response = await fetch(primary, options);
    if (response.status === 404 && primary === "/api/auth") {
      response = await fetch("/.netlify/functions/auth", options);
    }
    return response;
  }

  async function login(username, password) {
    if (!username || !password) {
      return { success: false, error: "Username and password are required." };
    }

    const sb = getSupabaseClient();
    if (sb) {
      try {
        const email = resolveSupabaseLoginEmail(username);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          return { success: false, error: error.message || "Invalid username or password." };
        }
        if (data && data.user && data.session) {
          const mappedUser = mapSupabaseUser(data.user);
          inMemoryUser = mappedUser;
          inMemoryToken = data.session.access_token;
          return {
            success: true,
            session: mappedUser,
            user: mappedUser,
            token: inMemoryToken
          };
        }
      } catch (sbErr) {
        console.warn("[Supabase Auth Login Fallback]:", sbErr.message);
      }
    }

    try {
      const response = await fetchAuthEndpoint({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin", // Accepts HttpOnly session cookie
        body: JSON.stringify({
          action: "login",
          username: username.trim(),
          password: password
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        inMemoryUser = data.user;
        inMemoryToken = data.token;
        return {
          success: true,
          session: data.user,
          user: data.user,
          token: data.token
        };
      }
      return { success: false, error: data.error || "Authentication failed." };
    } catch (err) {
      return { success: false, error: "Network error connecting to authentication service: " + err.message };
    }
  }

  async function logout() {
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (_) {}
    }
    try {
      await fetchAuthEndpoint({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "logout" })
      });
    } catch (_) {}
    inMemoryUser = null;
    inMemoryToken = null;
    return { success: true };
  }

  async function checkSession() {
    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data: sessionData } = await sb.auth.getSession();
        if (sessionData && sessionData.session) {
          const { data: userData, error: userErr } = await sb.auth.getUser();
          if (!userErr && userData && userData.user) {
            inMemoryUser = mapSupabaseUser(userData.user);
            inMemoryToken = sessionData.session.access_token;
            return inMemoryUser;
          }
          await sb.auth.signOut().catch(() => {});
        }
      } catch (_) {}
    }

    try {
      const response = await fetchAuthEndpoint({
        method: "GET",
        headers: {
          "Accept": "application/json",
          ...(inMemoryToken ? { "Authorization": `Bearer ${inMemoryToken}` } : {})
        },
        credentials: "same-origin"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          inMemoryUser = data.user;
          return inMemoryUser;
        }
      }
    } catch (_) {}
    inMemoryUser = null;
    inMemoryToken = null;
    return null;
  }

  function getActiveSession() {
    return inMemoryUser;
  }

  function getCurrentRole() {
    return inMemoryUser ? inMemoryUser.role : ROLES.PUBLIC;
  }

  function getAuthToken() {
    return inMemoryToken;
  }

  /**
   * Invoke Super Admin user management Edge Function with live Supabase JWT.
   */
  async function adminManageUsers(payload) {
    const sb = getSupabaseClient();
    if (!sb) {
      return { success: false, error: "Supabase client is not initialized." };
    }

    let accessToken = inMemoryToken;
    try {
      const { data: sessionData } = await sb.auth.getSession();
      if (sessionData && sessionData.session && sessionData.session.access_token) {
        accessToken = sessionData.session.access_token;
        inMemoryToken = accessToken;
      }
    } catch (_) {}

    if (!accessToken) {
      return { success: false, error: "No active Super Admin session. Please log in again." };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload || {})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          error: (data && data.error) || `Request failed with HTTP ${res.status}.`
        };
      }
      return data;
    } catch (err) {
      return {
        success: false,
        error: err && err.message ? `Network error: ${err.message}` : "Failed to reach admin service."
      };
    }
  }

  /**
   * Reset a password input + eye toggle back to hidden/masked state.
   */
  function resetPasswordToggle(inputEl, toggleBtnEl) {
    if (!inputEl) return;
    inputEl.type = "password";
    if (!toggleBtnEl) return;
    toggleBtnEl.setAttribute("aria-pressed", "false");
    toggleBtnEl.setAttribute("aria-label", "Show password");
    const openIcon = toggleBtnEl.querySelector(".jse-eye-open");
    const closedIcon = toggleBtnEl.querySelector(".jse-eye-closed");
    if (openIcon) openIcon.style.display = "block";
    if (closedIcon) closedIcon.style.display = "none";
  }

  /**
   * Bind an accessible show/hide password eye button to a password input.
   */
  function bindPasswordToggle(inputEl, toggleBtnEl) {
    if (!inputEl || !toggleBtnEl || toggleBtnEl.dataset.eyeBound === "1") return;
    toggleBtnEl.dataset.eyeBound = "1";
    toggleBtnEl.addEventListener("click", (e) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      const reveal = inputEl.type === "password";
      inputEl.type = reveal ? "text" : "password";
      toggleBtnEl.setAttribute("aria-pressed", reveal ? "true" : "false");
      toggleBtnEl.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      const openIcon = toggleBtnEl.querySelector(".jse-eye-open");
      const closedIcon = toggleBtnEl.querySelector(".jse-eye-closed");
      if (openIcon) openIcon.style.display = reveal ? "none" : "block";
      if (closedIcon) closedIcon.style.display = reveal ? "block" : "none";
      if (e && e.detail > 0 && typeof inputEl.focus === "function") {
        inputEl.focus();
      }
    });
  }

  /**
   * Move keyboard focus to the next (Enter) or previous (Shift+Enter) enabled field inside rootEl.
   */
  function bindEnterNavigation(rootEl, options = {}) {
    if (!rootEl || rootEl.dataset.enterNavBound === "1") return;
    rootEl.dataset.enterNavBound = "1";

    const fieldSelector =
      options.fieldSelector ||
      'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled])';

    const isVisible = (el) => {
      if (!el || el.disabled || el.readOnly) return false;
      if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
        const cs = window.getComputedStyle(el);
        if (cs && (cs.display === "none" || cs.visibility === "hidden")) return false;
      }
      return el.offsetParent !== null || (typeof el.getClientRects === "function" && el.getClientRects().length > 0);
    };

    rootEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing) return;
      const target = e.target;
      if (!target || !target.tagName) return;

      if (target.tagName === "TEXTAREA") {
        if ((e.ctrlKey || e.metaKey) && options.finishSelector) {
          const ctrlBtn = rootEl.querySelector(options.finishSelector) || document.querySelector(options.finishSelector);
          if (ctrlBtn && isVisible(ctrlBtn)) {
            e.preventDefault();
            ctrlBtn.click();
          }
        }
        return;
      }

      if (target.tagName === "BUTTON" || target.tagName === "A") return;
      if (!target.matches || !target.matches(fieldSelector)) return;

      const fields = Array.from(rootEl.querySelectorAll(fieldSelector)).filter(isVisible);
      const idx = fields.indexOf(target);
      if (idx === -1) return;

      e.preventDefault();
      const nextIdx = e.shiftKey ? idx - 1 : idx + 1;

      if (nextIdx >= 0 && nextIdx < fields.length) {
        const nextEl = fields[nextIdx];
        nextEl.focus();
        if (nextEl.tagName === "INPUT" && typeof nextEl.select === "function") {
          try { nextEl.select(); } catch (_) {}
        }
        if (typeof nextEl.scrollIntoView === "function") {
          nextEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        return;
      }

      if (!e.shiftKey) {
        const endTarget =
          typeof options.getFinishElement === "function"
            ? options.getFinishElement(target, rootEl)
            : (options.finishSelector ? rootEl.querySelector(options.finishSelector) || document.querySelector(options.finishSelector) : null);

        if (endTarget && isVisible(endTarget)) {
          if (options.submitOnLastEnter) {
            endTarget.click();
          } else if (typeof endTarget.focus === "function") {
            endTarget.focus();
            if (typeof endTarget.scrollIntoView === "function") {
              endTarget.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          }
        } else if (typeof options.onReachEnd === "function") {
          options.onReachEnd(target, e);
        }
      }
    });
  }

  function hasPermission(action, role) {
    const checkRole = role || getCurrentRole();
    const allowed = PERMISSIONS[action];
    return Array.isArray(allowed) && allowed.includes(checkRole);
  }

  function enforcePermission(action, role) {
    const checkRole = role || getCurrentRole();
    if (!hasPermission(action, checkRole)) {
      throw new Error(`Unauthorized: Action '${action}' requires elevated permissions.`);
    }
    return true;
  }

  return {
    ROLES,
    PERMISSIONS,
    login,
    logout,
    checkSession,
    getActiveSession,
    getCurrentRole,
    getAuthToken,
    getSupabaseClient,
    adminManageUsers,
    bindPasswordToggle,
    resetPasswordToggle,
    bindEnterNavigation,
    hasPermission,
    enforcePermission
  };
});
