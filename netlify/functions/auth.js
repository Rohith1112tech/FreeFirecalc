/**
 * =========================================================================
 * JACK SPARROW ESPORTS - NETLIFY AUTHENTICATION FUNCTION
 * Serverless administrative authentication, session management & HttpOnly cookies
 * =========================================================================
 */

const serverAuth = require('./server_auth');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

exports.handler = async function(event, context) {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  // 1. Session Verification (GET)
  if (event.httpMethod === 'GET') {
    const authResult = serverAuth.authenticateRequest({ headers: event.headers });
    if (authResult.authenticated) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, authenticated: true, user: authResult.user })
      };
    }
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, authenticated: false, error: 'No active authenticated session.' })
    };
  }

  // 2. Authentication Actions (POST: login, logout, verify)
  if (event.httpMethod === 'POST') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Malformed JSON payload.' })
      };
    }

    const action = String(body.action || 'login').toLowerCase();

    // Login Action
    if (action === 'login') {
      const loginResult = serverAuth.handleLogin(body.username, body.password);
      if (!loginResult.success) {
        return {
          statusCode: loginResult.status || 401,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: loginResult.error })
        };
      }

      const isSecure = (event.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production';
      const cookieHeader = serverAuth.generateSetCookieHeader(loginResult.token, isSecure);

      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Set-Cookie': cookieHeader
        },
        body: JSON.stringify({
          success: true,
          user: loginResult.user,
          token: loginResult.token
        })
      };
    }

    // Logout Action
    if (action === 'logout') {
      const clearCookie = serverAuth.generateClearCookieHeader();
      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Set-Cookie': clearCookie
        },
        body: JSON.stringify({ success: true, message: 'Logged out successfully.' })
      };
    }

    // Explicit Session Verify Action
    if (action === 'verify') {
      const authResult = serverAuth.authenticateRequest({ headers: event.headers });
      if (authResult.authenticated) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, authenticated: true, user: authResult.user })
        };
      }
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, authenticated: false, error: 'Invalid or expired session.' })
      };
    }

    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Unsupported auth action.' })
    };
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
  };
};
