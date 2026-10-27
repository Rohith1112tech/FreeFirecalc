/**
 * =========================================================================
 * FREE FIRE TOURNAMENT AUTO-BACKUP & SYNC - GOOGLE APPS SCRIPT WEB APP
 * Zero-Login Cloud Sync for Google Drive & Google Sheets
 * =========================================================================
 * 
 * Target Google Drive Folder: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5
 * Target Google Spreadsheet:  1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4
 *
 * HOW TO DEPLOY IN 60 SECONDS:
 * 1. Go to https://script.google.com/home/start and click "New project"
 *    (Or in your Google Sheet: Extensions > Apps Script)
 * 2. Delete any code in the editor, paste this entire file, and click Save (💾).
 * 3. Click "Deploy" (top right) > "New deployment".
 * 4. Select type: "Web app" (gear icon ⚙️).
 * 5. Description: "Free Fire Auto-Sync"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone" (allows zero-login saving from your calculator website).
 * 8. Click "Deploy" > "Authorize access" (log in with your Google account once).
 * 9. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...)
 * 10. Paste that URL into the "☁️ DRIVE CLOUD SYNC" popup in your Free Fire app!
 * =========================================================================
 */

const DRIVE_FOLDER_ID = '1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5';
const SPREADSHEET_ID = '1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Empty payload received' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'backup';

    let result = { success: true };

    // 1. Auto-save Tournament JSON Backup to Google Drive
    if (action === 'backup' || action === 'both' || payload.backupData) {
      result.backup = saveTournamentBackup(payload);
    }

    // 2. Append Match Scores to Google Sheet
    if (action === 'append_sheet' || action === 'both' || payload.sheetRows) {
      result.sheet = appendToSpreadsheet(payload);
    }

    // 3. Save Poster Image to Google Drive
    if (action === 'poster' && payload.base64Data) {
      result.poster = savePosterToDrive(payload);
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({
    success: true,
    status: 'ONLINE',
    service: 'Free Fire Scrims Zero-Login Drive & Sheets Webhook',
    folderId: DRIVE_FOLDER_ID,
    spreadsheetId: SPREADSHEET_ID,
    timestamp: new Date().toISOString()
  });
}

/**
 * Saves or updates in-place the tournament JSON file in Google Drive folder
 */
function saveTournamentBackup(payload) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const filename = payload.filename || 'FreeFire_Tournament_AutoBackup.json';
  const content = typeof payload.backupData === 'string'
    ? payload.backupData
    : JSON.stringify(payload.backupData || payload, null, 2);

  // Check if file already exists in folder: update it in-place
  const existingFiles = folder.getFilesByName(filename);
  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    file.setContent(content);
    return {
      id: file.getId(),
      name: filename,
      isUpdated: true,
      url: file.getUrl()
    };
  } else {
    const file = folder.createFile(filename, content, MimeType.PLAIN_TEXT);
    return {
      id: file.getId(),
      name: filename,
      isUpdated: false,
      url: file.getUrl()
    };
  }
}

/**
 * Appends match score rows to Google Spreadsheet
 * Supports dedicated separate tabs for LOBBY 1, LOBBY 2, and LOBBY 3
 */
function appendToSpreadsheet(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rows = payload.sheetRows || payload.rows || [];
  if (!rows || rows.length === 0) {
    return { rowsAppended: 0 };
  }

  const tabName = payload.lobbyName || 'LOBBY 1';
  let sheet = ss.getSheetByName(tabName);

  // If dedicated sheet tab doesn't exist, create it with header columns
  if (!sheet) {
    try {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow([
        'TIMESTAMP',
        'TOURNAMENT / SCRIMS TITLE',
        'MATCH',
        'RANK / PLACE',
        'TEAM NAME',
        'PLAYER ROSTER',
        'KILLS',
        'PLACEMENT POINTS',
        'TOTAL MATCH POINTS'
      ]);
      // Format header row
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#222b3a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    } catch (tabErr) {
      // Fallback to first sheet if insert fails
      sheet = ss.getSheets()[0];
    }
  }

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  return { rowsAppended: rows.length, sheetName: sheet.getName() };
}

/**
 * Saves exported poster JPG/PNG directly to Google Drive folder
 */
function savePosterToDrive(payload) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const filename = payload.filename || ('FreeFire_Poster_' + Date.now() + '.jpg');
  const mimeType = payload.mimeType || 'image/jpeg';
  
  const rawBase64 = payload.base64Data.replace(/^data:[^;]+;base64,/, '');
  const decodedBytes = Utilities.base64Decode(rawBase64);
  const blob = Utilities.newBlob(decodedBytes, mimeType, filename);
  
  const file = folder.createFile(blob);
  return {
    id: file.getId(),
    name: filename,
    url: file.getUrl()
  };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
