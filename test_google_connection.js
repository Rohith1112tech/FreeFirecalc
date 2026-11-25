const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const DRIVE_FOLDER_ID = '1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5';
const SPREADSHEET_ID = '1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4';

async function testConnection() {
  console.log('Testing authentication with Google API...');
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  });

  const authClient = await auth.getClient();
  console.log('✓ Auth client initialized successfully.');

  // 1. Test Drive Folder Access
  try {
    console.log(`Checking Drive Folder ID: ${DRIVE_FOLDER_ID}...`);
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderRes = await drive.files.get({
      fileId: DRIVE_FOLDER_ID,
      fields: 'id, name, mimeType',
      supportsAllDrives: true
    });
    console.log('✓ Drive folder verified:', folderRes.data);
  } catch (err) {
    console.error('✗ Drive folder error:', err.message);
  }

  // 2. Test Sheets Access
  try {
    console.log(`Checking Google Sheet ID: ${SPREADSHEET_ID}...`);
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const sheetRes = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    console.log('✓ Spreadsheet verified:', sheetRes.data.properties.title);
    console.log('Available sheets:', sheetRes.data.sheets.map(s => s.properties.title));
  } catch (err) {
    console.error('✗ Sheets error:', err.message);
  }
}

testConnection();
