const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const {
  appendMatchScores,
  uploadToDrive,
  generateAuthUrl,
  exchangeCodeForTokens,
  checkDriveAuthStatus,
  getOAuthClientConfig,
  saveUserTokens,
  DRIVE_FOLDER_ID,
  SPREADSHEET_ID
} = require('./google_service');
const serverAuth = require('./server_auth');

const PORT = process.env.PORT || 3000;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Production Startup Guard: Reject missing secrets at startup
if (process.env.NODE_ENV === 'production') {
  if (!ADMIN_API_KEY) {
    throw new Error('FATAL CONFIGURATION ERROR: ADMIN_API_KEY must be defined in production environment.');
  }
  if (!process.env.AUTH_SESSION_SECRET) {
    throw new Error('FATAL CONFIGURATION ERROR: AUTH_SESSION_SECRET must be defined in production environment.');
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Strict CORS Allowlists
const ALLOWED_ORIGINS = [
  'https://freefirecalc.netlify.app',
  'https://freefirecalc.com',
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:3000',
  'http://localhost:8888'
];

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  if (!origin && process.env.NODE_ENV !== 'production') {
    return `http://localhost:${PORT}`;
  }
  return ALLOWED_ORIGINS[0];
}

// In-Memory Rate Limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 req/min for general routes
const MAX_SENSITIVE_REQUESTS = 25;   // 25 req/min for write routes

function isRateLimited(ip, isSensitive = false) {
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, record);
    return false;
  }
  record.count++;
  const max = isSensitive ? MAX_SENSITIVE_REQUESTS : MAX_REQUESTS_PER_WINDOW;
  return record.count > max;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of rateLimitMap.entries()) {
    if (now > rec.resetTime) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// OAuth State Store for CSRF Prevention
const oauthStateCache = new Map();

function sendJson(res, statusCode, data, req = null, extraHeaders = {}) {
  const origin = req ? getCorsOrigin(req) : ALLOWED_ORIGINS[0];
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function parseBody(req, maxSizeBytes = 10 * 1024 * 1024) { // Default 10MB max
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > maxSizeBytes) {
        reject(new Error('Payload Too Large: exceeds maximum permitted size.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload.'));
      }
    });
    req.on('error', reject);
  });
}

// Request Authentication Guard: Cryptographic session verification
function authenticateAdmin(req) {
  const authResult = serverAuth.authenticateRequest(req);
  if (authResult.authenticated) {
    return {
      authenticated: true,
      role: authResult.user.role,
      user: authResult.user
    };
  }
  return { authenticated: false };
}

const server = http.createServer(async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    const origin = getCorsOrigin(req);
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const reqPath = parsedUrl.pathname;

  // Rate Limiting Check
  const isSensitive = ['/api/record-match-scores', '/api/upload-drive-file', '/api/oauth/configure', '/api/cloud-proxy'].includes(reqPath);
  if (isRateLimited(clientIp, isSensitive)) {
    return sendJson(res, 429, { success: false, error: 'Too Many Requests. Rate limit exceeded, please retry later.' }, req);
  }

  // ==========================================
  // SERVER-SIDE AUTHENTICATION & SESSION API
  // ==========================================
  if (reqPath === '/api/auth') {
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req, 64 * 1024);
        const action = body.action || 'login';

        if (action === 'login') {
          const loginResult = serverAuth.handleLogin(body.username, body.password);
          if (!loginResult.success) {
            return sendJson(res, loginResult.status, { success: false, error: loginResult.error }, req);
          }
          const isSecure = req.headers['x-forwarded-proto'] === 'https';
          const setCookie = serverAuth.generateSetCookieHeader(loginResult.token, isSecure);
          return sendJson(res, 200, {
            success: true,
            user: loginResult.user,
            token: loginResult.token
          }, req, { 'Set-Cookie': setCookie });
        }

        if (action === 'logout') {
          const clearCookie = serverAuth.generateClearCookieHeader();
          return sendJson(res, 200, { success: true, message: 'Logged out successfully.' }, req, { 'Set-Cookie': clearCookie });
        }

        return sendJson(res, 400, { success: false, error: 'Unknown auth action.' }, req);
      } catch (err) {
        return sendJson(res, 400, { success: false, error: 'Malformed request.' }, req);
      }
    }

    if (req.method === 'GET') {
      const authResult = serverAuth.authenticateRequest(req);
      if (authResult.authenticated) {
        return sendJson(res, 200, { success: true, authenticated: true, user: authResult.user }, req);
      }
      return sendJson(res, 401, { success: false, authenticated: false, error: 'No active session.' }, req);
    }
  }

  // ==========================================
  // CLOUD PROXY GATEWAY (Google Apps Script)
  // ==========================================
  if (req.method === 'POST' && reqPath === '/api/cloud-proxy') {
    const authResult = serverAuth.authenticateRequest(req);
    if (!authResult.authenticated) {
      return sendJson(res, 401, { success: false, error: 'Authentication required to access cloud services.' }, req);
    }

    try {
      const payload = await parseBody(req, 10 * 1024 * 1024);
      const action = String(payload.action || 'backup').toLowerCase();
      const ALLOWED_PROXY_ACTIONS = ['get_backup', 'get_all_lobbies', 'backup', 'append_sheet', 'poster'];
      if (!ALLOWED_PROXY_ACTIONS.includes(action)) {
        return sendJson(res, 403, { success: false, error: 'Action not permitted by cloud proxy allowlist.' }, req);
      }

      // Enforce Role Permissions
      const isWrite = ['backup', 'append_sheet', 'poster'].includes(action);
      const userRole = authResult.user.role;
      if (isWrite && ![serverAuth.ROLES.SUPER_ADMIN, serverAuth.ROLES.TOURNAMENT_ADMIN, serverAuth.ROLES.SCOREKEEPER].includes(userRole)) {
        return sendJson(res, 403, { success: false, error: 'Forbidden: Insufficient privileges for cloud write.' }, req);
      }

      const appsScriptUrl = process.env.APPS_SCRIPT_URL;
      const adminWebhookKey = process.env.ADMIN_WEBHOOK_KEY;

      if (!appsScriptUrl || !adminWebhookKey) {
        return sendJson(res, 500, { success: false, error: 'Cloud proxy not configured: APPS_SCRIPT_URL or ADMIN_WEBHOOK_KEY missing on server.' }, req);
      }

      // Inject secure server-side metadata and webhook secret
      payload.authKey = adminWebhookKey;
      payload.requestId = crypto.randomBytes(16).toString('hex');
      payload.timestamp = new Date().toISOString();
      delete payload.callerRole; // Never forward client-asserted role

      const proxyRes = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const proxyJson = await proxyRes.json();
      return sendJson(res, proxyRes.status, proxyJson, req);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: 'Cloud proxy gateway failure: ' + err.message }, req);
    }
  }

  // ==========================================
  // OAUTH 2.0 WEB AUTHENTICATION FLOW (SCENARIO A)
  // ==========================================

  // 1. Get OAuth Sign-In URL (with CSRF State Token)
  if (req.method === 'GET' && reqPath === '/api/oauth/auth-url') {
    try {
      const config = getOAuthClientConfig();
      if (!config) {
        return sendJson(res, 400, {
          success: false,
          configured: false,
          error: 'OAuth 2.0 credentials not yet configured. Please supply Client ID and Client Secret.'
        }, req);
      }

      // Generate cryptographically secure state token to protect against OAuth CSRF
      const stateToken = crypto.randomBytes(20).toString('hex');
      oauthStateCache.set(stateToken, { createdAt: Date.now() });

      // Clean up old states
      const stateNow = Date.now();
      for (const [st, val] of oauthStateCache.entries()) {
        if (stateNow - val.createdAt > 10 * 60 * 1000) oauthStateCache.delete(st);
      }

      const host = req.headers.host || `localhost:${PORT}`;
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const redirectUri = `${protocol}://${host}/oauth2callback`;

      const authUrl = generateAuthUrl(redirectUri, stateToken);
      return sendJson(res, 200, {
        success: true,
        authUrl,
        redirectUri,
        state: stateToken
      }, req);
    } catch (err) {
      console.error('Error generating auth URL:', err);
      return sendJson(res, 500, { success: false, error: 'Internal server error generating OAuth authorization.' }, req);
    }
  }

  // 2. OAuth Callback from Google consent screen (CSRF State Validated)
  if (req.method === 'GET' && reqPath === '/oauth2callback') {
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;
    const state = parsedUrl.query.state;

    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Google Drive Authorization Failed</title><style>body{background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding:50px;}</style></head>
        <body>
          <h2 style="color:#ef4444;">⚠️ Authorization Cancelled</h2>
          <p>${escapeHtml(error)}</p>
          <p><a href="/" style="color:#f59e0b;">Return to Free Fire Points Calculator</a></p>
        </body>
        </html>
      `);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Missing code parameter.');
    }

    // State verification against CSRF
    if (state && !oauthStateCache.has(state)) {
      console.warn('Potential OAuth CSRF detected: state token mismatch.');
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 Forbidden: Invalid or expired OAuth state parameter.');
    }
    if (state) oauthStateCache.delete(state);

    try {
      const host = req.headers.host || `localhost:${PORT}`;
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const redirectUri = `${protocol}://${host}/oauth2callback`;

      await exchangeCodeForTokens(code, redirectUri);

      // Return friendly success page with auto-redirect
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Drive Connected Successfully</title>
          <meta http-equiv="refresh" content="3;url=/" />
          <style>
            body { background: #07090e; color: #fff; font-family: 'Segoe UI', sans-serif; text-align: center; padding: 60px 20px; }
            .card { max-width: 500px; margin: 0 auto; background: #131722; padding: 30px; border-radius: 8px; border: 1px solid #00c2ff; box-shadow: 0 0 25px rgba(0, 194, 255, 0.4); }
            h2 { color: #10b981; margin-bottom: 10px; }
            p { color: #9ca3af; font-size: 15px; }
            a { display: inline-block; margin-top: 15px; padding: 10px 20px; background: #00c2ff; color: #050b16; text-decoration: none; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>✅ Google Drive Connected!</h2>
            <p>You have successfully authorized your Google account. Tournament files and backup uploads will now happen with your full quota.</p>
            <p>Redirecting you back to the tournament calculator in 3 seconds...</p>
            <a href="/">Click here to return now</a>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Google Drive Authorization Error</title><style>body{background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding:50px;}</style></head>
        <body>
          <h2 style="color:#ef4444;">❌ Failed to exchange authorization code</h2>
          <p>${escapeHtml(err.message)}</p>
          <p><a href="/" style="color:#f59e0b;">Return to application</a></p>
        </body>
        </html>
      `);
    }
  }

  // 3. Check Drive Auth Status
  if (req.method === 'GET' && reqPath === '/api/oauth/status') {
    try {
      const status = await checkDriveAuthStatus();
      return sendJson(res, 200, status, req);
    } catch (err) {
      return sendJson(res, 500, { error: 'Error checking drive auth status.' }, req);
    }
  }

  // 4. Save OAuth credentials directly from UI (Strictly Super Admin Protected)
  if (req.method === 'POST' && reqPath === '/api/oauth/configure') {
    const auth = authenticateAdmin(req);
    if (!auth.authenticated) {
      return sendJson(res, 401, { success: false, error: 'Unauthorized: Administrative credentials required.' }, req);
    }

    try {
      const payload = await parseBody(req, 100 * 1024); // Max 100KB for credentials
      const { clientId, clientSecret } = payload;
      if (!clientId || !clientSecret || typeof clientId !== 'string' || typeof clientSecret !== 'string') {
        return sendJson(res, 400, { success: false, error: 'Valid clientId and clientSecret strings are required.' }, req);
      }

      const clientConfig = {
        web: {
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          redirect_uris: [`http://localhost:${PORT}/oauth2callback`]
        }
      };

      fs.writeFileSync(path.join(__dirname, 'oauth_client.json'), JSON.stringify(clientConfig, null, 2), 'utf8');
      return sendJson(res, 200, { success: true, message: 'OAuth client credentials configured successfully.' }, req);
    } catch (err) {
      console.error('Error in /api/oauth/configure:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to configure OAuth client credentials.' }, req);
    }
  }

  // ==========================================
  // SCENARIO B: GOOGLE SHEETS POINTS TABLE (Protected)
  // ==========================================
  if (req.method === 'POST' && reqPath === '/api/record-match-scores') {
    const auth = authenticateAdmin(req);
    if (!auth.authenticated) {
      return sendJson(res, 401, { success: false, error: 'Unauthorized: Administrative credentials required to record scores.' }, req);
    }

    try {
      const payload = await parseBody(req, 2 * 1024 * 1024); // Max 2MB
      const { tournamentTitle, matchNumber, teamsData } = payload;

      const numMatch = parseInt(matchNumber, 10);
      if (isNaN(numMatch) || numMatch < 1 || numMatch > 24) {
        return sendJson(res, 400, { success: false, error: 'Invalid matchNumber: must be integer between 1 and 24.' }, req);
      }

      if (!Array.isArray(teamsData) || teamsData.length === 0 || teamsData.length > 24) {
        return sendJson(res, 400, { success: false, error: 'teamsData must be a non-empty array with at most 24 teams.' }, req);
      }

      // Validate each team data structure
      for (const t of teamsData) {
        if (!t || typeof t.teamName !== 'string') {
          return sendJson(res, 400, { success: false, error: 'Each team must have a valid teamName string.' }, req);
        }
      }

      const sanitizedTitle = String(tournamentTitle || 'JACK SPARROW PAID SCRIMS').slice(0, 150);
      const result = await appendMatchScores({ tournamentTitle: sanitizedTitle, matchNumber: numMatch, teamsData });

      return sendJson(res, 200, {
        success: true,
        message: `Successfully appended match ${numMatch} scores to Google Sheet.`,
        spreadsheetId: SPREADSHEET_ID,
        result
      }, req);
    } catch (err) {
      console.error('Error in /api/record-match-scores:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to record match scores to spreadsheet.' }, req);
    }
  }

  // ==========================================
  // SCENARIO A: GOOGLE DRIVE FILE UPLOAD (Protected)
  // ==========================================
  if (req.method === 'POST' && reqPath === '/api/upload-drive-file') {
    const auth = authenticateAdmin(req);
    if (!auth.authenticated) {
      return sendJson(res, 401, { success: false, error: 'Unauthorized: Administrative credentials required to upload files.' }, req);
    }

    try {
      const payload = await parseBody(req, 12 * 1024 * 1024); // Max 12MB
      const { filename, mimeType, base64Data, description, fileId, updateIfExists } = payload;

      if (!filename || typeof filename !== 'string' || !base64Data || typeof base64Data !== 'string') {
        return sendJson(res, 400, { success: false, error: 'Missing required filename or base64Data strings.' }, req);
      }

      // Filename sanitization - prevent path traversal
      const cleanFilename = path.basename(filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_'));
      const allowedExts = ['.json', '.png', '.jpg', '.jpeg'];
      const fileExt = path.extname(cleanFilename).toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        return sendJson(res, 400, { success: false, error: `Invalid file extension. Allowed extensions: ${allowedExts.join(', ')}` }, req);
      }

      const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const result = await uploadToDrive({
        filename: cleanFilename,
        mimeType: mimeType || 'application/octet-stream',
        buffer,
        description: description ? String(description).slice(0, 200) : '',
        fileId,
        updateIfExists: Boolean(updateIfExists)
      });

      return sendJson(res, 200, {
        success: true,
        message: `Successfully uploaded ${cleanFilename} to Google Drive folder.`,
        folderId: DRIVE_FOLDER_ID,
        file: result
      }, req);
    } catch (err) {
      console.error('Error in /api/upload-drive-file:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to upload file to Google Drive.' }, req);
    }
  }

  // API Status / Health Check
  if (req.method === 'GET' && reqPath === '/api/status') {
    const oauthStatus = await checkDriveAuthStatus().catch(() => ({ authenticated: false }));
    return sendJson(res, 200, {
      status: 'online',
      service: 'Jack Sparrow Esports API',
      driveFolderId: DRIVE_FOLDER_ID,
      spreadsheetId: SPREADSHEET_ID,
      oauthStatus
    }, req);
  }

  // ==========================================
  // STATIC ASSET SERVING WITH PATH TRAVERSAL PROTECTION
  // ==========================================
  let staticPath = reqPath === '/' ? '/index.html' : reqPath;
  // Prevent directory traversal attacks
  const safeRelativePath = path.normalize(staticPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safeRelativePath);

  // Enforce boundary check
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      });
      res.end(content);
    }
  });
});

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

server.listen(PORT, () => {
  console.log(`Free Fire Backend & Points Calculator running at: http://localhost:${PORT}`);
  console.log(`- Google Drive Folder: ${DRIVE_FOLDER_ID}`);
  console.log(`- Google Sheets ID: ${SPREADSHEET_ID}`);
  console.log(`- OAuth Redirect URI: http://localhost:${PORT}/oauth2callback`);
});
