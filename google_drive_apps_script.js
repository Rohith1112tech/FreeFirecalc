/**
 * =========================================================================
 * FREE FIRE TOURNAMENT AUTO-BACKUP & SYNC - GOOGLE APPS SCRIPT WEB APP
 * Zero-Login Cloud Sync for Google Drive & Google Sheets (Laptop & Mobile)
 * =========================================================================
 * 
 * Target Google Drive Folder: 1z3hDVkB47xRG7nHzkbqGfiAAJZGBJ4T5
 * Target Google Spreadsheet:  1_3I4QuGiJDRva3DgNqYQeGAJMvZHsddS54l0pw77lD4
 *
 * CRITICAL STEP FOR LAPTOP & MOBILE CROSS-DEVICE SYNC:
 * In script.google.com:
 * 1. Click "Deploy" (top right) > "Manage deployments"
 * 2. Click the Pencil icon ✏️ (Edit) on the active deployment
 * 3. Make sure "Who has access" is set to "Anyone" (NOT "Only myself")
 *    * If set to "Only myself", Mobile phones will get 403 "Access Denied" error!
 * 4. Set Version: "New version"
 * 5. Click "Deploy"
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

    // 0. Fetch / Pull backup from Google Drive (for mobile / laptop cross-sync)
    if (action === 'get_backup') {
      return jsonResponse(getTournamentBackup(payload.lobbyId || payload.lobby || 'lobby1'));
    }
    if (action === 'get_all_lobbies') {
      return jsonResponse(getAllLobbyBackups());
    }

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
  try {
    const action = (e && e.parameter && e.parameter.action) || 'status';
    const lobbyId = (e && e.parameter && (e.parameter.lobbyId || e.parameter.lobby)) || 'lobby1';

    // 1. Fetch single lobby backup (e.g. for mobile startup)
    if (action === 'get_backup') {
      return jsonResponse(getTournamentBackup(lobbyId));
    }

    // 2. Fetch all 3 lobbies in one request
    if (action === 'get_all_lobbies') {
      return jsonResponse(getAllLobbyBackups());
    }

    // 3. Default status ping
    return jsonResponse({
      success: true,
      status: 'ONLINE',
      service: 'Free Fire Scrims Zero-Login Drive & Sheets Webhook',
      folderId: DRIVE_FOLDER_ID,
      spreadsheetId: SPREADSHEET_ID,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Retrieves the most recent tournament backup for a lobby from Google Drive
 */
function getTournamentBackup(lobbyId) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const targetPrefix = 'FreeFire_' + (lobbyId || 'lobby1').toUpperCase().replace(/\s+/g, '');

  const files = folder.getFiles();
  let latestFile = null;
  let latestTime = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (name.startsWith(targetPrefix) && name.endsWith('.json')) {
      const updated = file.getLastUpdated().getTime();
      if (updated > latestTime) {
        latestTime = updated;
        latestFile = file;
      }
    }
  }

  // Fallback: check legacy filename if lobby1 requested
  if (!latestFile && (lobbyId === 'lobby1' || !lobbyId)) {
    const legacyFiles = folder.getFilesByName('FreeFire_Tournament_AutoBackup.json');
    if (legacyFiles.hasNext()) {
      latestFile = legacyFiles.next();
    }
  }

  if (latestFile) {
    const content = latestFile.getBlob().getDataAsString();
    let parsedData = null;
    try {
      parsedData = JSON.parse(content);
    } catch (_) {
      parsedData = content;
    }
    return {
      success: true,
      found: true,
      lobbyId: lobbyId || 'lobby1',
      filename: latestFile.getName(),
      lastUpdated: latestFile.getLastUpdated().toISOString(),
      backupData: parsedData
    };
  }

  return {
    success: true,
    found: false,
    lobbyId: lobbyId || 'lobby1',
    message: 'No cloud backup found yet for ' + (lobbyId || 'lobby1')
  };
}

/**
 * Retrieves backups for all 3 lobbies in one request
 */
function getAllLobbyBackups() {
  return {
    success: true,
    lobbies: {
      lobby1: getTournamentBackup('lobby1'),
      lobby2: getTournamentBackup('lobby2'),
      lobby3: getTournamentBackup('lobby3')
    }
  };
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
