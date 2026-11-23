/**
 * =========================================================================
 * JACK SPARROW ESPORTS - NETLIFY CLOUD PROXY GATEWAY
 * Authenticated Serverless Proxy for Google Apps Script Webhook.
 * Strict RBAC enforcement, payload validation, rate limiting & secret injection.
 * =========================================================================
 */

const crypto = require('crypto');
const serverAuth = require('./server_auth');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

const ALLOWED_ACTIONS = ['get_backup', 'get_all_lobbies', 'backup', 'append_sheet', 'poster'];
const ALLOWED_LOBBIES = ['lobby1', 'lobby2', 'lobby3'];
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// Simple in-memory sliding window rate limiter for the function instance
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(clientIp) {
  const now = Date.now();
  let rec = rateLimitMap.get(clientIp);
  if (!rec || now > rec.resetTime) {
    rec = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(clientIp, rec);
    return false;
  }
  rec.count++;
  return rec.count > MAX_REQUESTS_PER_WINDOW;
}

exports.handler = async function(event, context) {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Only POST is permitted.' })
    };
  }

  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Too Many Requests. Rate limit exceeded, please retry later.' })
    };
  }

  // 1. Mandatory Server-Side Caller Authentication (NEVER allow anonymous access to proxy)
  const authResult = serverAuth.authenticateRequest({ headers: event.headers });
  if (!authResult.authenticated) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Unauthorized: Valid administrative session or API credentials required to access cloud services.'
      })
    };
  }

  // 2. Request Size Validation
  const rawBody = event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_PAYLOAD_BYTES) {
    return {
      statusCode: 413,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Payload Too Large: exceeds 10MB limit.' })
    };
  }

  // 3. Payload Parsing & Schema Validation
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (_) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Malformed JSON payload.' })
    };
  }

  const action = String(payload.action || 'backup').toLowerCase();
  if (!ALLOWED_ACTIONS.includes(action)) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Action not allowed by security proxy policy.' })
    };
  }

  const lobbyId = String(payload.lobbyId || payload.lobby || 'lobby1').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (lobbyId && !ALLOWED_LOBBIES.includes(lobbyId)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Invalid lobby identifier specified.' })
    };
  }

  // 4. Role-Based Permissions Enforcement
  const userRole = authResult.user.role;
  const isWriteAction = ['backup', 'append_sheet', 'poster'].includes(action);

  if (isWriteAction) {
    const writePermittedRoles = [
      serverAuth.ROLES.SUPER_ADMIN,
      serverAuth.ROLES.TOURNAMENT_ADMIN,
      serverAuth.ROLES.SCOREKEEPER
    ];
    if (!writePermittedRoles.includes(userRole)) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Forbidden: Insufficient privileges for cloud write operations.' })
      };
    }
  }

  // 5. Upstream Environment Verification
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const adminWebhookKey = process.env.ADMIN_WEBHOOK_KEY;

  if (!appsScriptUrl || !adminWebhookKey) {
    console.error('FATAL: APPS_SCRIPT_URL or ADMIN_WEBHOOK_KEY is not defined in Netlify environment variables.');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Cloud Proxy Configuration Error: Server environment variables are missing.'
      })
    };
  }

  // 6. Inject Server-Side Authentication & Replay Protection Nonces
  payload.authKey = adminWebhookKey;
  payload.requestId = crypto.randomBytes(16).toString('hex');
  payload.timestamp = new Date().toISOString();
  delete payload.callerRole; // Prevent client role injection

  // 7. Secure Dispatch to Google Apps Script Webhook
  try {
    const upstreamResponse = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await upstreamResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (_) {
      responseData = { success: upstreamResponse.ok, message: responseText };
    }

    return {
      statusCode: upstreamResponse.status || 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(responseData)
    };
  } catch (err) {
    console.error('Upstream Google Apps Script error:', err.message);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Bad Gateway: Unable to communicate with cloud data provider.'
      })
    };
  }
};
