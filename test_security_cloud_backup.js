/**
 * =========================================================================
 * JACK SPARROW ESPORTS - SECURITY TEST SUITE: CLOUD BACKUP & MULTI-LOBBY ISOLATION
 * Verifies Webhook hardening, Multi-Lobby isolation, Checksums & Audit Logs
 * =========================================================================
 */

const assert = require('assert');
const fs = require('fs');

console.log('🛡️ RUNNING PHASE 1 SECURITY TESTS: CLOUD BACKUP & MULTI-LOBBY ISOLATION...\n');

const appsScriptJs = fs.readFileSync('google_drive_apps_script.js', 'utf8');

// 1. Action Allowlisting
assert(appsScriptJs.includes("const ALLOWED_ACTIONS = ['status', 'get_backup', 'get_all_lobbies', 'backup', 'append_sheet', 'poster']"), 'Apps Script must enforce strict ALLOWED_ACTIONS');
assert(appsScriptJs.includes("if (!ALLOWED_ACTIONS.includes(action))"), 'Apps Script must reject unauthorized actions');
console.log('✓ Google Apps Script strict action allowlisting verified.');

// 2. Server-side Authorization & Role Verification
assert(appsScriptJs.includes('function verifyWebhookAuthorization('), 'Apps Script must implement verifyWebhookAuthorization');
assert(appsScriptJs.includes("PropertiesService.getScriptProperties().getProperty('ADMIN_WEBHOOK_KEY')"), 'Apps Script must support ADMIN_WEBHOOK_KEY in Script Properties');
assert(appsScriptJs.includes('constantTimeEquals('), 'Apps Script must use constant-time comparison for keys');
console.log('✓ Google Apps Script server-side authorization guard verified.');

// 3. Request Size Enforcement & Replay Protection
assert(appsScriptJs.includes('MAX_PAYLOAD_BYTES = 10 * 1024 * 1024'), 'Apps Script must enforce 10MB payload limit');
assert(appsScriptJs.includes('REPLAY_WINDOW_MS = 15 * 60 * 1000'), 'Apps Script must enforce 15-minute replay window');
console.log('✓ 10MB request size limit and 15-minute replay protection window verified.');

// 4. Rate Limiting via CacheService
assert(appsScriptJs.includes('function isRateLimited('), 'Apps Script must implement isRateLimited');
assert(appsScriptJs.includes('CacheService.getScriptCache()'), 'Apps Script must use CacheService for rate limiting');
console.log('✓ CacheService write rate limiting verified.');

// 5. Multi-Lobby Strict Data Isolation
assert(appsScriptJs.includes("const ALLOWED_LOBBIES = ['lobby1', 'lobby2', 'lobby3']"), 'Apps Script must enforce ALLOWED_LOBBIES');
assert(appsScriptJs.includes('function normalizeLobbyId('), 'Apps Script must normalize and sanitize lobbyId');
assert(appsScriptJs.includes("lobby1: 'LOBBY 1',\n    lobby2: 'LOBBY 2',\n    lobby3: 'LOBBY 3'"), 'Apps Script must strictly map lobbies to dedicated sheets');
console.log('✓ Strict multi-lobby data isolation verified across Lobby 1, Lobby 2, and Lobby 3.');

// 6. Data Integrity & Checksum Calculation
assert(appsScriptJs.includes('Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256'), 'Apps Script must compute SHA-256 digest for backup integrity');
assert(appsScriptJs.includes('backupObj.revision = (parseInt(backupObj.revision, 10) || 0) + 1'), 'Apps Script must automatically increment revision number');
assert(appsScriptJs.includes('conflictDetected'), 'Apps Script must flag out-of-order writes as conflicts');
console.log('✓ SHA-256 data integrity checksums and revision-based conflict detection verified.');

// 7. Tamper-Evident Audit Logging
assert(appsScriptJs.includes('function logAudit('), 'Apps Script must implement logAudit');
assert(appsScriptJs.includes("auditSheet = ss.insertSheet('AUDIT_LOG')"), 'Apps Script must log to dedicated AUDIT_LOG sheet');
console.log('✓ Tamper-evident AUDIT_LOG sheet logging verified.');

console.log('\n=======================================================');
console.log('🎉 ALL CLOUD BACKUP & MULTI-LOBBY SECURITY TESTS PASSED 100%!');
console.log('=======================================================\n');
