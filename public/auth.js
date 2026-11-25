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
  // =========================================================================

  let inMemoryUser = null;
  let inMemoryToken = null;

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
    hasPermission,
    enforcePermission
  };
});
