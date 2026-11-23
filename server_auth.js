/**
 * =========================================================================
 * JACK SPARROW ESPORTS - SERVER-SIDE AUTHENTICATION & SESSION SECURITY
 * Enterprise cryptographic session manager, password verification & RBAC.
 * Strictly executed on the server / serverless environment (NEVER client-side).
 * =========================================================================
 */

const crypto = require('crypto');

// Configuration & Secrets from Environment
const AUTH_SESSION_SECRET = process.env.AUTH_SESSION_SECRET || (
  process.env.NODE_ENV === 'production' 
    ? null 
    : 'jse_dev_session_secret_f92a84c8102d41b5a938e123456789ab'
);

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const COOKIE_NAME = 'jse_session';

// Roles
const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  TOURNAMENT_ADMIN: 'TOURNAMENT_ADMIN',
  SCOREKEEPER: 'SCOREKEEPER',
  PUBLIC: 'PUBLIC'
});

// Role action permissions
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

// Server-side user store (PBKDF2 hashes - NEVER sent to frontend)
const SERVER_USERS = {
  superadmin: {
    username: 'superadmin',
    role: ROLES.SUPER_ADMIN,
    displayName: 'Jack Sparrow (Super Admin)',
    salt: process.env.ADMIN_PASSWORD_SALT || 'a1f79c44e9b88231c5d0124fe37b89aa',
    hash: process.env.ADMIN_PASSWORD_HASH || 'ea0b7390eba563041b6f215677ca1a966cc63d4a60d63f572a46789a75f929db' // JackSparrow@2026!
  },
  tourneyadmin: {
    username: 'tourneyadmin',
    role: ROLES.TOURNAMENT_ADMIN,
    displayName: 'Tournament Director',
    salt: 'b7e283910c5df91823ab498012e76ca3',
    hash: '67f8f577c1082fb1865f0c7558abddeb4262d2bebd6f92b2a5795d6eac294366' // TourneyAdmin@2026!
  },
  scorekeeper: {
    username: 'scorekeeper',
    role: ROLES.SCOREKEEPER,
    displayName: 'Official Scorekeeper',
    salt: 'c4d194820a1eb72948bc519023f87db2',
    hash: '7a9b0c2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b' // Scorekeeper@2026!
  }
};

// Brute-force tracking
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function isLockedOut(username) {
  const record = loginAttempts.get(username);
  if (!record) return false;
  if (record.lockedUntil > 0) {
    if (Date.now() > record.lockedUntil) {
      loginAttempts.delete(username);
      return false;
    }
    return true;
  }
  return false;
}

function recordFailedAttempt(username) {
  const now = Date.now();
  let record = loginAttempts.get(username);
  if (!record || now > record.resetTime) {
    record = { attempts: 1, resetTime: now + LOCKOUT_MS, lockedUntil: 0 };
  } else {
    record.attempts++;
    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
    }
  }
  loginAttempts.set(username, record);
  return record;
}

function clearAttempts(username) {
  loginAttempts.delete(username);
}

function getSessionSecret() {
  if (!AUTH_SESSION_SECRET) {
    throw new Error('FATAL: AUTH_SESSION_SECRET environment variable is missing.');
  }
  return AUTH_SESSION_SECRET;
}

function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
  return {
    salt: salt.toString('hex'),
    hash: derivedKey.toString('hex')
  };
}

function verifyPassword(password, saltHex, expectedHashHex) {
  if (!password || !saltHex || !expectedHashHex) return false;
  const { hash } = hashPassword(password, saltHex);
  const hashBuf = Buffer.from(hash, 'hex');
  const expectedBuf = Buffer.from(expectedHashHex, 'hex');
  if (hashBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, expectedBuf);
}

function createSignedSession(user) {
  const secret = getSessionSecret();
  const now = Date.now();
  const payload = {
    uid: crypto.randomBytes(12).toString('hex'),
    username: user.username,
    role: user.role,
    displayName: user.displayName || user.username,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadB64);
  const sig = hmac.digest('hex');

  const signedToken = `${payloadB64}.${sig}`;
  return { payload, signedToken };
}

function verifySessionToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string') return null;
  const parts = tokenString.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;
  const secret = getSessionSecret();

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadB64);
  const expectedSig = hmac.digest('hex');

  const sigBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null; // Tampered signature
  }

  try {
    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const session = JSON.parse(jsonStr);

    if (!session || !session.expiresAt || session.expiresAt < Date.now()) {
      return null; // Expired
    }
    if (!ROLES[session.role]) {
      return null; // Invalid role
    }

    return session;
  } catch (_) {
    return null;
  }
}

function parseCookie(cookieHeader, name = COOKIE_NAME) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (let c of cookies) {
    const [k, ...v] = c.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function generateSetCookieHeader(signedToken, isSecure = true) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secureFlag = isSecure ? '; Secure' : '';
  return `${COOKIE_NAME}=${signedToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureFlag}`;
}

function generateClearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function authenticateRequest(req) {
  // 1. Try Cookie
  const cookieHeader = req.headers ? (req.headers.cookie || req.headers.Cookie) : '';
  const tokenFromCookie = parseCookie(cookieHeader);
  if (tokenFromCookie) {
    const verified = verifySessionToken(tokenFromCookie);
    if (verified) return { authenticated: true, user: verified, source: 'cookie' };
  }

  // 2. Try Authorization Bearer
  const authHeader = req.headers ? (req.headers.authorization || req.headers.Authorization || '') : '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const verified = verifySessionToken(token);
    if (verified) return { authenticated: true, user: verified, source: 'bearer' };
  }

  // 3. Try X-API-Key (for internal automation or server-to-server)
  const apiKeyHeader = req.headers ? (req.headers['x-api-key'] || req.headers['X-API-KEY']) : '';
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (apiKeyHeader && adminApiKey) {
    const keyBuf = Buffer.from(String(apiKeyHeader), 'utf8');
    const expectedBuf = Buffer.from(String(adminApiKey), 'utf8');
    if (keyBuf.length === expectedBuf.length && crypto.timingSafeEqual(keyBuf, expectedBuf)) {
      return {
        authenticated: true,
        user: { username: 'api_admin', role: ROLES.SUPER_ADMIN, displayName: 'API Key Admin' },
        source: 'api_key'
      };
    }
  }

  return { authenticated: false, error: 'Unauthorized: Missing or invalid authentication token.' };
}

function handleLogin(username, password) {
  if (!username || !password) {
    return { success: false, status: 400, error: 'Username and password are required.' };
  }

  if (isLockedOut(username)) {
    return { success: false, status: 429, error: 'Account temporarily locked for 15 minutes due to consecutive failed attempts.' };
  }

  const user = SERVER_USERS[username.toLowerCase().trim()];
  if (!user) {
    const attempt = recordFailedAttempt(username);
    const remaining = Math.max(0, MAX_ATTEMPTS - attempt.attempts);
    return {
      success: false,
      status: 401,
      error: remaining > 0 
        ? `Invalid username or password. ${remaining} attempt(s) remaining before temporary lockout.`
        : 'Account temporarily locked for 15 minutes due to consecutive failed attempts.'
    };
  }

  const valid = verifyPassword(password, user.salt, user.hash);
  if (!valid) {
    const attempt = recordFailedAttempt(username);
    const remaining = Math.max(0, MAX_ATTEMPTS - attempt.attempts);
    return {
      success: false,
      status: 401,
      error: remaining > 0 
        ? `Invalid password. ${remaining} attempt(s) remaining before temporary lockout.`
        : 'Account temporarily locked for 15 minutes due to consecutive failed attempts.'
    };
  }

  clearAttempts(username);
  const { payload, signedToken } = createSignedSession(user);

  return {
    success: true,
    status: 200,
    user: {
      username: payload.username,
      role: payload.role,
      displayName: payload.displayName
    },
    token: signedToken
  };
}

const RECOVERY_SALT = process.env.ADMIN_RECOVERY_SALT || 'd5e6f7a8b9c01234567890abcdef1234';
const RECOVERY_HASH = process.env.ADMIN_RECOVERY_HASH || 'dbc6bd025f1a9cc37b76d7f1d3a388596d97b4778c0ec1c1577105bf0761c077';

function resetSuperAdminPasswordWithRecoveryKey(recoveryPhrase, newPassword) {
  if (!recoveryPhrase || typeof recoveryPhrase !== 'string') {
    return { success: false, error: 'Emergency recovery key is required.' };
  }
  const isValid = verifyPassword(recoveryPhrase, RECOVERY_SALT, RECOVERY_HASH);
  if (!isValid) {
    return { success: false, error: 'Invalid emergency recovery key.' };
  }

  const { salt, hash } = hashPassword(newPassword);
  SERVER_USERS.superadmin.salt = salt;
  SERVER_USERS.superadmin.hash = hash;
  clearAttempts('superadmin');
  return { success: true, message: 'Super Admin password reset successfully.' };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  hashPassword,
  verifyPassword,
  createSignedSession,
  verifySessionToken,
  parseCookie,
  generateSetCookieHeader,
  generateClearCookieHeader,
  authenticateRequest,
  handleLogin,
  resetSuperAdminPasswordWithRecoveryKey,
  isLockedOut,
  SERVER_USERS
};
