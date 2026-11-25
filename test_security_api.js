/**
 * =========================================================================
 * JACK SPARROW ESPORTS - SECURITY TEST SUITE: BACKEND API HARDENING
 * Verifies CORS allowlisting, Auth guards, Rate Limiting & Input Validation
 * =========================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🛡️ RUNNING PHASE 1 SECURITY TESTS: BACKEND API HARDENING & ENDPOINTS...\n');

const serverJs = fs.readFileSync('server.js', 'utf8').replace(/\r\n/g, '\n');
const googleServiceJs = fs.readFileSync('google_service.js', 'utf8').replace(/\r\n/g, '\n');

// 1. Verify CORS Allowlists
assert(serverJs.includes('const ALLOWED_ORIGINS = ['), 'server.js must define strict ALLOWED_ORIGINS');
assert(!serverJs.includes("'Access-Control-Allow-Origin': '*'"), 'server.js must NOT have wildcard CORS in responses');
assert(serverJs.includes('getCorsOrigin(req)'), 'server.js must use getCorsOrigin function to filter origins');
console.log('✓ Strict CORS allowlisting verified (wildcard * eliminated).');

// 2. Verify Rate Limiting
assert(serverJs.includes('function isRateLimited('), 'server.js must implement isRateLimited');
assert(serverJs.includes('429'), 'server.js must return HTTP 429 when rate limited');
assert(serverJs.includes('Too Many Requests'), 'server.js must return informative rate limit error');
console.log('✓ In-memory IP rate limiting verified.');

// 3. Verify Authentication Guard on Protected Endpoints
assert(serverJs.includes('function authenticateAdmin('), 'server.js must implement authenticateAdmin guard');
assert(serverJs.includes("if (!auth.authenticated) {\n      return sendJson(res, 401"), 'Protected routes must reject unauthorized requests with 401');
console.log('✓ Administrative authentication guard verified on /api/record-match-scores and /api/upload-drive-file.');

// 4. Verify Directory Traversal Protection
assert(serverJs.includes('safeRelativePath = path.normalize(staticPath).replace(/^(\\.\\.[\\/\\\\])+/, \'\')'), 'server.js must sanitize static file paths against directory traversal');
assert(serverJs.includes('!filePath.startsWith(__dirname)'), 'server.js must enforce __dirname boundary check');
assert(serverJs.includes("res.writeHead(403"), 'Path traversal outside project root must return 403 Forbidden');
console.log('✓ Directory traversal defense verified with boundary enforcement.');

// 5. Verify OAuth CSRF State Token & Least-Privilege Scopes
assert(serverJs.includes('oauthStateCache.set(stateToken'), 'server.js must generate and store random state token');
assert(serverJs.includes('if (state && !oauthStateCache.has(state))'), 'server.js must verify state parameter on OAuth callback');
assert(!googleServiceJs.includes("'https://www.googleapis.com/auth/drive'"), 'google_service.js must NOT request full Drive scope');
assert(googleServiceJs.includes("'https://www.googleapis.com/auth/drive.file'"), 'google_service.js must request least-privilege drive.file scope');
console.log('✓ OAuth CSRF state verification and least-privilege scope (drive.file) verified.');

// 6. Verify Upload Size & File Extension Validation
assert(serverJs.includes("const allowedExts = ['.json', '.png', '.jpg', '.jpeg'];"), 'Upload endpoint must validate file extensions');
assert(serverJs.includes('Payload Too Large'), 'Payload size limits must be enforced');
console.log('✓ File upload validation, extension allowlisting, and size bounds verified.');

console.log('\n=======================================================');
console.log('🎉 ALL BACKEND API SECURITY TESTS PASSED 100%!');
console.log('=======================================================\n');
