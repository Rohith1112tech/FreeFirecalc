const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

const DRIVE_FOLDER_ID = '1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5';
const SPREADSHEET_ID = '1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4';

let authClient = null;

function getCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON environment variable:', e);
    }
  }

  const credPath = path.join(__dirname, 'credentials.json');
  if (fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  }

  throw new Error('No Google credentials found in environment or credentials.json file.');
}

async function getAuth() {
  if (authClient) return authClient;

  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  });

  authClient = await auth.getClient();
  return authClient;
}

/**
 * Scenario A: Upload a file/backup stream to Google Drive folder
 */
async function uploadToDrive({ filename, mimeType, buffer, description }) {
  const auth = await getAuth();
  const drive = google.drive({ version: 'v3', auth });

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

  return response.data;
}

/**
 * Scenario B: Append recorded match score rows to Google Spreadsheet
 */
async function appendMatchScores({ tournamentTitle, matchNumber, teamsData }) {
  const auth = await getAuth();
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
  getAuth,
  uploadToDrive,
  appendMatchScores,
  DRIVE_FOLDER_ID,
  SPREADSHEET_ID
};
