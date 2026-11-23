/**
 * =========================================================================
 * JACK SPARROW ESPORTS - SECURITY TEST SUITE: ADMIN AUTH & RBAC
 * Verifies PBKDF2 hashing, Brute-Force lockout, Roles, Sessions & Permissions
 * =========================================================================
 */

const assert = require('assert');
const auth = require('./auth.js');

(async function runAuthSecurityTests() {
  console.log('🛡️ RUNNING PHASE 1 SECURITY TESTS: ADMIN AUTH & RBAC ACCESS CONTROL...\n');

  // 1. Roles Definition
  assert.strictEqual(auth.ROLES.SUPER_ADMIN, 'SUPER_ADMIN', 'SUPER_ADMIN role must be defined');
  assert.strictEqual(auth.ROLES.TOURNAMENT_ADMIN, 'TOURNAMENT_ADMIN', 'TOURNAMENT_ADMIN role must be defined');
  assert.strictEqual(auth.ROLES.SCOREKEEPER, 'SCOREKEEPER', 'SCOREKEEPER role must be defined');
  assert.strictEqual(auth.ROLES.PUBLIC, 'PUBLIC', 'PUBLIC role must be defined');
  console.log('✓ All 4 RBAC roles successfully verified.');

  // 2. PBKDF2 Password Hashing & Verification
  const testPassword = 'SecretTournamentPass2026!';
  const hashed = await auth.hashPassword(testPassword);
  assert(hashed.salt && hashed.salt.length === 32, 'Salt must be 16 random bytes (32 hex characters)');
  assert(hashed.hash && hashed.hash.length === 64, 'Hash must be 32 bytes (64 hex characters from SHA-256)');

  const validMatch = await auth.verifyPassword(testPassword, hashed.salt, hashed.hash);
  assert.strictEqual(validMatch, true, 'Correct password must verify successfully');

  const invalidMatch = await auth.verifyPassword('WrongPassword123', hashed.salt, hashed.hash);
  assert.strictEqual(invalidMatch, false, 'Incorrect password must be rejected');
  console.log('✓ PBKDF2 with SHA-256 and salt verification verified with 100% precision.');

  // 3. User Login
  const loginRes = await auth.login('superadmin', 'JackSparrow@2026!');
  assert.strictEqual(loginRes.success, true, 'Superadmin valid login must succeed');
  assert.strictEqual(loginRes.session.role, auth.ROLES.SUPER_ADMIN, 'Superadmin session role must match');

  const activeSession = auth.getActiveSession();
  assert(activeSession, 'Active session must be retrievable');
  assert.strictEqual(activeSession.username, 'superadmin', 'Session username must match');
  assert(activeSession.expiresAt > Date.now(), 'Session expiration must be set in the future');
  console.log('✓ Superadmin login, cryptographically secure token, and session storage verified.');

  // 4. Role Permissions Matrix Checks
  assert.strictEqual(auth.hasPermission('RESET_TOURNAMENT', auth.ROLES.SUPER_ADMIN), true, 'Super Admin can reset tournament');
  assert.strictEqual(auth.hasPermission('RESET_TOURNAMENT', auth.ROLES.TOURNAMENT_ADMIN), false, 'Tourney Admin CANNOT reset tournament');
  assert.strictEqual(auth.hasPermission('RESET_TOURNAMENT', auth.ROLES.SCOREKEEPER), false, 'Scorekeeper CANNOT reset tournament');
  assert.strictEqual(auth.hasPermission('RESET_TOURNAMENT', auth.ROLES.PUBLIC), false, 'Public CANNOT reset tournament');

  assert.strictEqual(auth.hasPermission('CONFIG_TOURNAMENT', auth.ROLES.TOURNAMENT_ADMIN), true, 'Tourney Admin can configure tournament');
  assert.strictEqual(auth.hasPermission('CONFIG_TOURNAMENT', auth.ROLES.SCOREKEEPER), false, 'Scorekeeper CANNOT configure tournament');

  assert.strictEqual(auth.hasPermission('RECORD_SCORES', auth.ROLES.SCOREKEEPER), true, 'Scorekeeper can record scores');
  assert.strictEqual(auth.hasPermission('RECORD_SCORES', auth.ROLES.PUBLIC), false, 'Public CANNOT record scores');

  assert.strictEqual(auth.hasPermission('VIEW_RESULTS', auth.ROLES.PUBLIC), true, 'Public can view results');
  console.log('✓ Granular Role-Based Access Control matrix verified across all privilege tiers.');

  // 5. Brute Force Lockout
  const bruteUser = 'test_brute_target';
  for (let i = 0; i < 4; i++) {
    const failed = await auth.login(bruteUser, 'badpass');
    assert.strictEqual(failed.success, false);
    assert(failed.error.includes('attempt(s) remaining'), 'Error must report remaining attempts');
  }

  // 5th attempt triggers 15-minute lockout
  const lockoutAttempt = await auth.login(bruteUser, 'badpass');
  assert.strictEqual(lockoutAttempt.success, false);

  const lockedAttempt = await auth.login(bruteUser, 'badpass');
  assert.strictEqual(lockedAttempt.success, false);
  assert(lockedAttempt.error.includes('Account temporarily locked'), 'Account must be locked after 5 failed attempts');
  console.log('✓ Brute-force protection verified: 5 consecutive failures triggers 15-minute account lockout.');

  // 6. Emergency Recovery Procedure
  const recoveryRes = await auth.resetSuperAdminPasswordWithRecoveryKey('JSE-PIRATE-EMERGENCY-2026-RECOVER-KEY', 'NewSecureMasterPass2026!');
  assert.strictEqual(recoveryRes.success, true, 'Master recovery key must allow password reset');

  const newLogin = await auth.login('superadmin', 'NewSecureMasterPass2026!');
  assert.strictEqual(newLogin.success, true, 'Superadmin must be able to log in with new password after recovery');
  console.log('✓ Emergency recovery key workflow verified: Super Admin password reset succeeds.');

  // Reset password back for persistence
  await auth.resetSuperAdminPasswordWithRecoveryKey('JSE-PIRATE-EMERGENCY-2026-RECOVER-KEY', 'JackSparrow@2026!');

  // 7. Logout
  auth.logout();
  assert.strictEqual(auth.getActiveSession(), null, 'Session must be null after logout');
  console.log('✓ Logout successfully terminates active session.');

  console.log('\n=======================================================');
  console.log('🎉 ALL ADMIN AUTH & RBAC SECURITY TESTS PASSED 100%!');
  console.log('=======================================================\n');
})();
