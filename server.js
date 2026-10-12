const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
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

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 25 * 1024 * 1024) { // 25MB max
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const reqPath = parsedUrl.pathname;

  // ==========================================
  // OAUTH 2.0 WEB AUTHENTICATION FLOW (SCENARIO A)
  // ==========================================

  // 1. Get OAuth Sign-In URL
  if (req.method === 'GET' && reqPath === '/api/oauth/auth-url') {
    try {
      const config = getOAuthClientConfig();
      if (!config) {
        return sendJson(res, 400, {
          success: false,
          configured: false,
          error: 'OAuth 2.0 credentials not yet configured. Please supply Client ID and Client Secret.'
        });
      }
      const host = req.headers.host || `localhost:${PORT}`;
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const redirectUri = `${protocol}://${host}/oauth2callback`;

      const authUrl = generateAuthUrl(redirectUri);
      return sendJson(res, 200, {
        success: true,
        authUrl,
        redirectUri
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 2. OAuth Callback from Google consent screen
  if (req.method === 'GET' && reqPath === '/oauth2callback') {
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;

    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
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

    try {
      const host = req.headers.host || `localhost:${PORT}`;
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const redirectUri = `${protocol}://${host}/oauth2callback`;

      await exchangeCodeForTokens(code, redirectUri);

      // Return friendly success page with auto-redirect
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Drive Connected Successfully</title>
          <meta http-equiv="refresh" content="3;url=/" />
          <style>
            body { background: #07090e; color: #fff; font-family: 'Segoe UI', sans-serif; text-align: center; padding: 60px 20px; }
            .card { max-width: 500px; margin: 0 auto; background: #131722; padding: 30px; border-radius: 8px; border: 1px solid #ff1744; box-shadow: 0 0 25px rgba(255, 23, 68, 0.4); }
            h2 { color: #10b981; margin-bottom: 10px; }
            p { color: #9ca3af; font-size: 15px; }
            a { display: inline-block; margin-top: 15px; padding: 10px 20px; background: #ff1744; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>✅ Google Drive Connected!</h2>
            <p>You have successfully authorized your main Google account (5 TB Storage). File and backup uploads will now happen with your full quota.</p>
            <p>Redirecting you back to the tournament calculator in 3 seconds...</p>
            <a href="/">Click here to return now</a>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
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
      return sendJson(res, 200, status);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 4. Save OAuth credentials directly from UI (if user inputs them via modal/settings)
  if (req.method === 'POST' && reqPath === '/api/oauth/configure') {
    try {
      const payload = await parseBody(req);
      const { clientId, clientSecret } = payload;
      if (!clientId || !clientSecret) {
        return sendJson(res, 400, { success: false, error: 'clientId and clientSecret are required.' });
      }

      const clientConfig = {
        web: {
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          redirect_uris: [`http://localhost:${PORT}/oauth2callback`]
        }
      };

      fs.writeFileSync(path.join(__dirname, 'oauth_client.json'), JSON.stringify(clientConfig, null, 2), 'utf8');
      return sendJson(res, 200, { success: true, message: 'OAuth client credentials configured successfully.' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // ==========================================
  // SCENARIO B: GOOGLE SHEETS POINTS TABLE
  // ==========================================
  if (req.method === 'POST' && reqPath === '/api/record-match-scores') {
    try {
      const payload = await parseBody(req);
      const { tournamentTitle, matchNumber, teamsData } = payload;

      if (!matchNumber || !Array.isArray(teamsData) || teamsData.length === 0) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing required matchNumber or teamsData array.'
        });
      }

      const result = await appendMatchScores({ tournamentTitle, matchNumber, teamsData });
      return sendJson(res, 200, {
        success: true,
        message: `Successfully appended match ${matchNumber} scores to Google Sheet.`,
        spreadsheetId: SPREADSHEET_ID,
        result
      });
    } catch (err) {
      console.error('Error in /api/record-match-scores:', err);
      return sendJson(res, 500, {
        success: false,
        error: err.message
      });
    }
  }

  // ==========================================
  // SCENARIO A: GOOGLE DRIVE FILE UPLOAD
  // ==========================================
  if (req.method === 'POST' && reqPath === '/api/upload-drive-file') {
    try {
      const payload = await parseBody(req);
      const { filename, mimeType, base64Data, description } = payload;

      if (!filename || !base64Data) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing required filename or base64Data.'
        });
      }

      const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const result = await uploadToDrive({
        filename,
        mimeType: mimeType || 'application/octet-stream',
        buffer,
        description
      });

      return sendJson(res, 200, {
        success: true,
        message: `Successfully uploaded ${filename} to Google Drive folder using ${result.uploadMethod === 'oauth_user' ? 'your 5 TB account' : 'service account'}.`,
        folderId: DRIVE_FOLDER_ID,
        file: result
      });
    } catch (err) {
      console.error('Error in /api/upload-drive-file:', err);
      return sendJson(res, 500, {
        success: false,
        error: err.message
      });
    }
  }

  // API Status / Health Check
  if (req.method === 'GET' && reqPath === '/api/status') {
    const oauthStatus = await checkDriveAuthStatus().catch(() => ({ authenticated: false }));
    return sendJson(res, 200, {
      status: 'online',
      driveFolderId: DRIVE_FOLDER_ID,
      spreadsheetId: SPREADSHEET_ID,
      oauthStatus
    });
  }

  // ==========================================
  // STATIC ASSET SERVING
  // ==========================================
  let staticPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(__dirname, staticPath);
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
      res.writeHead(200, { 'Content-Type': contentType });
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
