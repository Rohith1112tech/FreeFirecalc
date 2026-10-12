const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

const DRIVE_FOLDER_ID = '1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5';
const SPREADSHEET_ID = '1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4';

const OAUTH_TOKENS_PATH = path.join(__dirname, 'oauth_tokens.json');
const OAUTH_CLIENT_PATH = path.join(__dirname, 'oauth_client.json');
const CLIENT_SECRET_PATH = path.join(__dirname, 'client_secret.json');

// OAuth 2.0 Scopes required for uploading to Google Drive on behalf of user
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

let serviceAccountAuthClient = null;

// =========================================================================
// SCENARIO B: SERVICE ACCOUNT AUTH (FOR SPREADSHEET POINTS TABLE)
// =========================================================================
function getServiceAccountCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  const credPath = path.join(__dirname, 'credentials.json');
  if (fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  }

  throw new Error('No service account credentials found in environment or credentials.json.');
}

async function getServiceAccountAuth() {
  if (serviceAccountAuthClient) return serviceAccountAuthClient;

  const credentials = getServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  serviceAccountAuthClient = await auth.getClient();
  return serviceAccountAuthClient;
}

// =========================================================================
// SCENARIO A: OAUTH 2.0 USER AUTH (FOR 5 TB GOOGLE DRIVE STORAGE)
// =========================================================================

function getOAuthClientConfig() {
  // Check env vars first
  if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://freefirecalc.netlify.app/oauth2callback'
    };
  }

  // Check client_secret.json and oauth_client.json files
  const fileCandidates = [CLIENT_SECRET_PATH, OAUTH_CLIENT_PATH];
  for (const candidatePath of fileCandidates) {
    if (fs.existsSync(candidatePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
        const details = parsed.web || parsed.installed || parsed;
        if (details.client_id) {
          return {
            clientId: details.client_id,
            clientSecret: details.client_secret,
            redirectUri: (details.redirect_uris && details.redirect_uris[0]) || 'https://freefirecalc.netlify.app/oauth2callback'
          };
        }
      } catch (err) {
        console.warn(`Could not parse ${candidatePath}:`, err.message);
      }
    }
  }

  return null;
}

function getOAuth2Client(redirectUriOverride) {
  const config = getOAuthClientConfig();
  if (!config) {
    throw new Error(
      'OAuth 2.0 Client credentials not configured. Please supply GOOGLE_OAUTH_CLIENT_ID & GOOGLE_OAUTH_CLIENT_SECRET or create oauth_client.json in the project root.'
    );
  }

  const redirectUri = redirectUriOverride || config.redirectUri;
  return new google.auth.OAuth2(config.clientId, config.clientSecret, redirectUri);
}

function getSavedUserTokens() {
  if (process.env.GOOGLE_USER_REFRESH_TOKEN) {
    return {
      refresh_token: process.env.GOOGLE_USER_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_USER_ACCESS_TOKEN || null
    };
  }

  if (fs.existsSync(OAUTH_TOKENS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(OAUTH_TOKENS_PATH, 'utf8'));
    } catch (err) {
      console.warn('Could not read oauth_tokens.json:', err.message);
    }
  }

  return null;
}

function saveUserTokens(tokens) {
  const existing = getSavedUserTokens() || {};
  const merged = { ...existing, ...tokens };
  fs.writeFileSync(OAUTH_TOKENS_PATH, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * Generate Google OAuth 2.0 Sign-In URL for user
 */
function generateAuthUrl(redirectUriOverride) {
  const oauth2Client = getOAuth2Client(redirectUriOverride);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh_token
    prompt: 'consent',     // Forces consent prompt so refresh_token is always returned
    scope: OAUTH_SCOPES
  });
}

/**
 * Exchange auth code from callback for tokens
 */
async function exchangeCodeForTokens(code, redirectUriOverride) {
  const oauth2Client = getOAuth2Client(redirectUriOverride);
  const { tokens } = await oauth2Client.getToken(code);
  saveUserTokens(tokens);
  return tokens;
}

/**
 * Check if user is currently authorized for Google Drive
 */
async function checkDriveAuthStatus() {
  const config = getOAuthClientConfig();
  if (!config) {
    return {
      configured: false,
      authenticated: false,
      message: 'OAuth Client ID & Secret not configured yet.'
    };
  }

  const tokens = getSavedUserTokens();
  if (!tokens || (!tokens.refresh_token && !tokens.access_token)) {
    return {
      configured: true,
      authenticated: false,
      message: 'Not signed in. Please sign in with your main Google account.'
    };
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Verify token by querying drive user info
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const about = await drive.about.get({ fields: 'user, storageQuota' });

    return {
      configured: true,
      authenticated: true,
      user: about.data.user,
      storageQuota: about.data.storageQuota,
      message: `Signed in as ${about.data.user ? about.data.user.emailAddress : 'Authorized User'}`
    };
  } catch (err) {
    return {
      configured: true,
      authenticated: false,
      error: err.message,
      message: 'Saved token expired or invalid. Please sign in again.'
    };
  }
}

/**
 * Upload to Google Drive using either OAuth User Tokens (Primary, 5TB quota)
 * or Fallback to Service Account
 */
async function uploadToDrive({ filename, mimeType, buffer, description }) {
  const tokens = getSavedUserTokens();

  let driveAuth = null;
  let uploadMethod = 'service_account';

  if (tokens && (tokens.refresh_token || tokens.access_token)) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    oauth2Client.on('tokens', (newTokens) => {
      saveUserTokens(newTokens);
    });
    driveAuth = oauth2Client;
    uploadMethod = 'oauth_user';
  } else {
    // Fallback to service account if user hasn't signed in yet
    driveAuth = await getServiceAccountAuth();
    uploadMethod = 'service_account';
  }

  const drive = google.drive({ version: 'v3', auth: driveAuth });

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const fileMetadata = {
    name: filename,
    parents: [DRIVE_FOLDER_ID],
    description: description || 'Uploaded via Free Fire Scrims Calculator'
  };

  const media = {
    mimeType: mimeType || 'application/octet-stream',
    body: stream
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, size, createdTime',
    supportsAllDrives: true
  });

  return {
    ...response.data,
    uploadMethod
  };
}

// =========================================================================
// SCENARIO B: APPEND MATCH SCORES (UNCHANGED, RUNS ON SERVICE ACCOUNT)
// =========================================================================
async function appendMatchScores({ tournamentTitle, matchNumber, teamsData }) {
  const auth = await getServiceAccountAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Ensure header row exists
  const headerCheck = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A1:I1'
  });

  if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:I1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          'Timestamp',
          'Tournament Title',
          'Match #',
          'Rank / Placement',
          'Team Name',
          'Roster / Players',
          'Kill Points',
          'Placement Points',
          'Total Match Points'
        ]]
      }
    });
  }

  // 2. Prepare rows to append
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const rowsToAppend = teamsData.map(team => [
    now,
    tournamentTitle || 'Free Fire Scrims',
    `Match ${matchNumber}`,
    team.placement !== undefined && team.placement !== '' ? Number(team.placement) : '-',
    team.teamName || 'Unknown Team',
    Array.isArray(team.players) ? team.players.filter(Boolean).join(', ') : (team.players || ''),
    Number(team.kills || 0),
    Number(team.placementPoints || 0),
    Number(team.totalPoints || 0)
  ]);

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: rowsToAppend
    }
  });

  return appendRes.data;
}

module.exports = {
  getServiceAccountAuth,
  generateAuthUrl,
  exchangeCodeForTokens,
  checkDriveAuthStatus,
  uploadToDrive,
  appendMatchScores,
  getOAuthClientConfig,
  saveUserTokens,
  DRIVE_FOLDER_ID,
  SPREADSHEET_ID
};
