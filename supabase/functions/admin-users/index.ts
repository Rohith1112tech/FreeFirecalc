import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = new Set(["SUPER_ADMIN", "TOURNAMENT_ADMIN", "SCOREKEEPER"]);
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getServiceKey(): string {
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (legacyServiceRole) return legacyServiceRole;
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysJson) {
    try {
      const parsed = JSON.parse(secretKeysJson);
      if (parsed && typeof parsed.default === "string" && parsed.default) {
        return parsed.default;
      }
    } catch (_) {
      // Fallback exhausted
    }
  }
  return "";
}

function toInternalEmail(username: string): string {
  return `${username.trim().toLowerCase()}@ffscrims.app`;
}

function formatUserRow(u: Record<string, any>, callerId: string) {
  const appMeta = (u.app_metadata || {}) as Record<string, any>;
  const rawEmail = String(u.email || "");
  const fallbackName = rawEmail ? rawEmail.split("@")[0] : "User";
  const username = String(appMeta.username || fallbackName);
  const role = ALLOWED_ROLES.has(appMeta.role) ? String(appMeta.role) : "TOURNAMENT_ADMIN";
  return {
    id: String(u.id),
    email: rawEmail,
    username,
    role,
    created_at: u.created_at || null,
    last_sign_in_at: u.last_sign_in_at || null,
    is_self: u.id === callerId,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = getServiceKey();
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ success: false, error: "Server configuration incomplete." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ success: false, error: "Missing Authorization Bearer token." }, 401);
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return jsonResponse({ success: false, error: "Empty access token." }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Verify live user session with Supabase Auth and enforce immutable app_metadata.role
  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
  const caller = callerData?.user;
  if (callerErr || !caller) {
    return jsonResponse({ success: false, error: "Invalid or expired session." }, 401);
  }

  const callerRole = String(caller.app_metadata?.role || "");
  if (callerRole !== "SUPER_ADMIN") {
    return jsonResponse({ success: false, error: "Forbidden: Super Admin privileges required." }, 403);
  }

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch (_) {
    return jsonResponse({ success: false, error: "Malformed JSON request body." }, 400);
  }

  const action = String(body.action || "list").toLowerCase();

  try {
    if (action === "list") {
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) {
        return jsonResponse({ success: false, error: listErr.message }, 400);
      }

      const roleWeight: Record<string, number> = {
        SUPER_ADMIN: 0,
        TOURNAMENT_ADMIN: 1,
        SCOREKEEPER: 2,
      };
      const users = (listData?.users || [])
        .map((u) => formatUserRow(u as Record<string, any>, caller.id))
        .sort((a, b) => {
          const rwA = roleWeight[a.role] ?? 9;
          const rwB = roleWeight[b.role] ?? 9;
          if (rwA !== rwB) return rwA - rwB;
          return a.username.localeCompare(b.username);
        });

      return jsonResponse({ success: true, users });
    }

    if (action === "create") {
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const requestedRole = String(body.role || "TOURNAMENT_ADMIN").trim();

      if (!USERNAME_REGEX.test(username)) {
        return jsonResponse({
          success: false,
          error: "Username must be 3-32 characters using only letters, numbers, dots (.), underscores (_), or hyphens (-).",
        }, 400);
      }
      if (password.length < 6 || password.length > 128) {
        return jsonResponse({
          success: false,
          error: "Password must be between 6 and 128 characters.",
        }, 400);
      }
      if (!ALLOWED_ROLES.has(requestedRole)) {
        return jsonResponse({ success: false, error: "Invalid role specified." }, 400);
      }

      const email = toInternalEmail(username);
      const { data: createdData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          username,
          role: requestedRole,
        },
        user_metadata: {
          display_name: username,
        },
      });

      if (createErr || !createdData?.user) {
        const msg = createErr?.message || "Failed to create user.";
        const status = /already registered|already exists/i.test(msg) ? 409 : 400;
        return jsonResponse({
          success: false,
          error: status === 409 ? `Username "${username}" already exists.` : msg,
        }, status);
      }

      return jsonResponse({
        success: true,
        user: formatUserRow(createdData.user as Record<string, any>, caller.id),
      }, 201);
    }

    if (action === "update") {
      const userId = String(body.userId || "").trim();
      if (!userId) {
        return jsonResponse({ success: false, error: "Target userId is required." }, 400);
      }

      const { data: existingData, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      const targetUser = existingData?.user;
      if (fetchErr || !targetUser) {
        return jsonResponse({ success: false, error: "Target user not found." }, 404);
      }

      const currentAppMeta = (targetUser.app_metadata || {}) as Record<string, any>;
      const currentUserMeta = (targetUser.user_metadata || {}) as Record<string, any>;
      const existingUsername = String(currentAppMeta.username || targetUser.email?.split("@")[0] || "User");
      const existingRole = ALLOWED_ROLES.has(currentAppMeta.role) ? String(currentAppMeta.role) : "TOURNAMENT_ADMIN";

      const nextUsername = body.username !== undefined ? String(body.username).trim() : existingUsername;
      const nextRole = body.role !== undefined ? String(body.role).trim() : existingRole;
      const nextPassword = body.password !== undefined ? String(body.password) : "";

      if (!USERNAME_REGEX.test(nextUsername)) {
        return jsonResponse({
          success: false,
          error: "Username must be 3-32 characters using only letters, numbers, dots (.), underscores (_), or hyphens (-).",
        }, 400);
      }
      if (!ALLOWED_ROLES.has(nextRole)) {
        return jsonResponse({ success: false, error: "Invalid role specified." }, 400);
      }
      if (userId === caller.id && nextRole !== "SUPER_ADMIN") {
        return jsonResponse({
          success: false,
          error: "You cannot downgrade your own active Super Admin role.",
        }, 400);
      }
      if (nextPassword && (nextPassword.length < 6 || nextPassword.length > 128)) {
        return jsonResponse({
          success: false,
          error: "New password must be between 6 and 128 characters.",
        }, 400);
      }

      const updateAttrs: Record<string, any> = {
        app_metadata: {
          ...currentAppMeta,
          username: nextUsername,
          role: nextRole,
        },
        user_metadata: {
          ...currentUserMeta,
          display_name: nextUsername,
        },
      };

      const nextEmail = toInternalEmail(nextUsername);
      if (nextEmail !== String(targetUser.email || "").toLowerCase()) {
        updateAttrs.email = nextEmail;
        updateAttrs.email_confirm = true;
      }

      if (nextPassword) {
        updateAttrs.password = nextPassword;
      }

      const { data: updatedData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updateAttrs
      );

      if (updateErr || !updatedData?.user) {
        const msg = updateErr?.message || "Failed to update user.";
        const status = /already registered|already exists|duplicate/i.test(msg) ? 409 : 400;
        return jsonResponse({
          success: false,
          error: status === 409 ? `Username "${nextUsername}" is already in use.` : msg,
        }, status);
      }

      return jsonResponse({
        success: true,
        user: formatUserRow(updatedData.user as Record<string, any>, caller.id),
      });
    }

    if (action === "delete") {
      const userId = String(body.userId || "").trim();
      if (!userId) {
        return jsonResponse({ success: false, error: "Target userId is required." }, 400);
      }
      if (userId === caller.id) {
        return jsonResponse({
          success: false,
          error: "You cannot delete your own active Super Admin account.",
        }, 400);
      }

      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteErr) {
        return jsonResponse({ success: false, error: deleteErr.message || "Failed to delete user." }, 400);
      }

      return jsonResponse({ success: true, deletedId: userId });
    }

    return jsonResponse({ success: false, error: `Unsupported action: ${action}` }, 400);
  } catch (err: any) {
    return jsonResponse({
      success: false,
      error: err?.message ? String(err.message) : "Unexpected server error.",
    }, 500);
  }
});
