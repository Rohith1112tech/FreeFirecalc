const http = require('http');
const fs = require('fs');
const path = require('path');
const { appendMatchScores, uploadToDrive, DRIVE_FOLDER_ID, SPREADSHEET_ID } = require('./google_service');

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

  const [reqPath] = req.url.split('?');

  // ==========================================
  // API ENDPOINTS FOR GOOGLE INTEGRATION
  // ==========================================

  // Scenario B Endpoint: Append match scores to Google Sheets
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

  // Scenario A Endpoint: Upload backup or files to Google Drive
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

      // Convert Base64 payload to binary buffer
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
        message: `Successfully uploaded ${filename} to Google Drive folder.`,
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
    return sendJson(res, 200, {
      status: 'online',
      driveFolderId: DRIVE_FOLDER_ID,
      spreadsheetId: SPREADSHEET_ID
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

server.listen(PORT, () => {
  console.log(`Free Fire Backend & Points Calculator running at: http://localhost:${PORT}`);
  console.log(`- Google Drive Folder: ${DRIVE_FOLDER_ID}`);
  console.log(`- Google Sheets ID: ${SPREADSHEET_ID}`);
});
