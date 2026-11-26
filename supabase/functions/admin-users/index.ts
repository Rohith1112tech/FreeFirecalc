import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = new Set(["SUPER_ADMIN", "TOURNAMENT_ADMIN", "SCOREKEEPER"]);
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;
const LOBBY_ID_REGEX = /^[a-z0-9][a-z0-9_-]{1,31}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function generateLobbySlug(label: string, existingIds: Set<string>): string {
  const lobbyNumMatch = label.trim().match(/^lobby\s*(\d+)$/i);
  let base = lobbyNumMatch
    ? `lobby${lobbyNumMatch[1]}`
    : label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

  if (base.length < 2 || !/^[a-z0-9]/.test(base)) {
    base = `lobby-${existingIds.size + 1}`;
  }
  base = base.slice(0, 26);

  let candidate = base;
  let counter = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base.slice(0, 24)}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function formatUserRow(
  u: Record<string, any>,
  callerId: string,
  assignedByUser: Record<string, string[]> = {}
) {
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
    assigned_lobbies: role === "SUPER_ADMIN" ? ["*"] : (assignedByUser[String(u.id)] || []),
    created_at: u.created_at || null,
    last_sign_in_at: u.last_sign_in_at || null,
    is_self: u.id === callerId,
  };
}

async function fetchAssignmentMaps(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("lobby_assignments")
    .select("lobby_id, user_id");

  if (error) {
    throw new Error(error.message || "Failed to load lobby assignments.");
  }

  const byUser: Record<string, string[]> = {};
  const byLobby: Record<string, string[]> = {};

  for (const row of data || []) {
    const lId = String(row.lobby_id || "");
    const uId = String(row.user_id || "");
    if (!lId || !uId) continue;
    if (!byUser[uId]) byUser[uId] = [];
    if (!byUser[uId].includes(lId)) byUser[uId].push(lId);

    if (!byLobby[lId]) byLobby[lId] = [];
    if (!byLobby[lId].includes(uId)) byLobby[lId].push(uId);
  }

  return { byUser, byLobby };
}

async function fetchLobbiesList(
  supabaseAdmin: any,
  byLobby: Record<string, string[]>,
  usernameById: Record<string, string> = {}
) {
  const { data, error } = await supabaseAdmin
    .from("lobbies")
    .select("id, label, default_title, db_tag, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load lobbies.");
  }

  return (data || []).map((row: any) => {
    const userIds = byLobby[row.id] || [];
    return {
      id: String(row.id),
      label: String(row.label),
      default_title: String(row.default_title || ""),
      db_tag: String(row.db_tag || ""),
      sort_order: Number(row.sort_order) || 0,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
      assigned_user_ids: userIds,
      assigned_usernames: userIds.map((uid) => usernameById[uid] || uid),
    };
  });
}

async function buildUsernameMap(supabaseAdmin: any): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) return {};
  const map: Record<string, string> = {};
  for (const u of data?.users || []) {
    const appMeta = (u.app_metadata || {}) as Record<string, any>;
    const rawEmail = String(u.email || "");
    map[String(u.id)] = String(appMeta.username || (rawEmail ? rawEmail.split("@")[0] : "User"));
  }
  return map;
}

async function replaceUserAssignments(
  supabaseAdmin: any,
  userId: string,
  lobbyIds: string[],
  callerId: string
): Promise<string[]> {
  const cleanIds = Array.from(
    new Set(lobbyIds.map((id) => String(id || "").trim().toLowerCase()).filter((id) => LOBBY_ID_REGEX.test(id)))
  );

  // Verify requested lobby IDs actually exist
  let validIds: string[] = [];
  if (cleanIds.length > 0) {
    const { data: existingLobbies, error: lobbyCheckErr } = await supabaseAdmin
      .from("lobbies")
      .select("id")
      .in("id", cleanIds);
    if (lobbyCheckErr) {
      throw new Error(lobbyCheckErr.message || "Failed to validate lobbies.");
    }
    const existingSet = new Set((existingLobbies || []).map((l: any) => String(l.id)));
    validIds = cleanIds.filter((id) => existingSet.has(id));
  }

  const { error: delErr } = await supabaseAdmin
    .from("lobby_assignments")
    .delete()
    .eq("user_id", userId);
  if (delErr) {
    throw new Error(delErr.message || "Failed to update user lobby assignments.");
  }

  if (validIds.length > 0) {
    const rows = validIds.map((lobbyId) => ({
      lobby_id: lobbyId,
      user_id: userId,
      assigned_by: callerId,
    }));
    const { error: insErr } = await supabaseAdmin.from("lobby_assignments").insert(rows);
    if (insErr) {
      throw new Error(insErr.message || "Failed to assign lobbies to user.");
    }
  }

  return validIds;
}

async function replaceLobbyUsers(
  supabaseAdmin: any,
  lobbyId: string,
  userIds: string[],
  callerId: string
): Promise<string[]> {
  const cleanUserIds = Array.from(
    new Set(userIds.map((id) => String(id || "").trim()).filter((id) => UUID_REGEX.test(id)))
  );

  const { error: delErr } = await supabaseAdmin
    .from("lobby_assignments")
    .delete()
    .eq("lobby_id", lobbyId);
  if (delErr) {
    throw new Error(delErr.message || "Failed to update lobby user assignments.");
  }

  if (cleanUserIds.length > 0) {
    const rows = cleanUserIds.map((uid) => ({
      lobby_id: lobbyId,
      user_id: uid,
      assigned_by: callerId,
    }));
    const { error: insErr } = await supabaseAdmin.from("lobby_assignments").insert(rows);
    if (insErr) {
      throw new Error(insErr.message || "Failed to assign admins to lobby.");
    }
  }

  return cleanUserIds;
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
    // =========================================================================
    // USER + LOBBY COMBINED LIST
    // =========================================================================
    if (action === "list") {
      const [{ data: listData, error: listErr }, assignMaps] = await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        fetchAssignmentMaps(supabaseAdmin),
      ]);
      if (listErr) {
        return jsonResponse({ success: false, error: listErr.message }, 400);
      }

      const roleWeight: Record<string, number> = {
        SUPER_ADMIN: 0,
        TOURNAMENT_ADMIN: 1,
        SCOREKEEPER: 2,
      };
      const rawUsers = listData?.users || [];
      const usernameById: Record<string, string> = {};
      rawUsers.forEach((u) => {
        const appMeta = (u.app_metadata || {}) as Record<string, any>;
        const rawEmail = String(u.email || "");
        usernameById[String(u.id)] = String(appMeta.username || (rawEmail ? rawEmail.split("@")[0] : "User"));
      });

      const users = rawUsers
        .map((u) => formatUserRow(u as Record<string, any>, caller.id, assignMaps.byUser))
        .sort((a, b) => {
          const rwA = roleWeight[a.role] ?? 9;
          const rwB = roleWeight[b.role] ?? 9;
          if (rwA !== rwB) return rwA - rwB;
          return a.username.localeCompare(b.username);
        });

      const lobbies = await fetchLobbiesList(supabaseAdmin, assignMaps.byLobby, usernameById);

      return jsonResponse({ success: true, users, lobbies });
    }

    // =========================================================================
    // USER CREATE
    // =========================================================================
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

      let assignedLobbies: string[] = [];
      if (requestedRole !== "SUPER_ADMIN" && Array.isArray(body.assigned_lobbies)) {
        assignedLobbies = await replaceUserAssignments(
          supabaseAdmin,
          createdData.user.id,
          body.assigned_lobbies,
          caller.id
        );
      }

      return jsonResponse({
        success: true,
        user: formatUserRow(createdData.user as Record<string, any>, caller.id, {
          [createdData.user.id]: assignedLobbies,
        }),
      }, 201);
    }

    // =========================================================================
    // USER UPDATE (USERNAME, PASSWORD, ROLE & ASSIGNED LOBBIES)
    // =========================================================================
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

      if (nextRole === "SUPER_ADMIN") {
        await replaceUserAssignments(supabaseAdmin, userId, [], caller.id);
      } else if (Array.isArray(body.assigned_lobbies)) {
        await replaceUserAssignments(supabaseAdmin, userId, body.assigned_lobbies, caller.id);
      }

      const assignMaps = await fetchAssignmentMaps(supabaseAdmin);

      return jsonResponse({
        success: true,
        user: formatUserRow(updatedData.user as Record<string, any>, caller.id, assignMaps.byUser),
      });
    }

    // =========================================================================
    // USER DELETE
    // =========================================================================
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

    // =========================================================================
    // LOBBY LIST
    // =========================================================================
    if (action === "lobby_list") {
      const [assignMaps, usernameById] = await Promise.all([
        fetchAssignmentMaps(supabaseAdmin),
        buildUsernameMap(supabaseAdmin),
      ]);
      const lobbies = await fetchLobbiesList(supabaseAdmin, assignMaps.byLobby, usernameById);
      return jsonResponse({ success: true, lobbies });
    }

    // =========================================================================
    // LOBBY CREATE
    // =========================================================================
    if (action === "lobby_create") {
      const label = String(body.label || "").trim().toUpperCase();
      if (label.length < 1 || label.length > 32) {
        return jsonResponse({
          success: false,
          error: "Lobby name must be between 1 and 32 characters.",
        }, 400);
      }

      const { data: existingRows, error: fetchErr } = await supabaseAdmin
        .from("lobbies")
        .select("id, sort_order");
      if (fetchErr) {
        return jsonResponse({ success: false, error: fetchErr.message || "Failed to check lobbies." }, 400);
      }

      const existingIds = new Set((existingRows || []).map((r: any) => String(r.id)));
      const maxSort = (existingRows || []).reduce(
        (acc: number, r: any) => Math.max(acc, Number(r.sort_order) || 0),
        0
      );

      let lobbyId = body.id ? String(body.id).trim().toLowerCase() : "";
      if (lobbyId) {
        if (!LOBBY_ID_REGEX.test(lobbyId)) {
          return jsonResponse({
            success: false,
            error: "Lobby ID must be 2–32 lowercase characters (a-z, 0-9, -, _).",
          }, 400);
        }
        if (existingIds.has(lobbyId)) {
          return jsonResponse({
            success: false,
            error: `Lobby ID "${lobbyId}" already exists.`,
          }, 409);
        }
      } else {
        lobbyId = generateLobbySlug(label, existingIds);
      }

      const nextIndex = existingIds.size + 1;
      const dbTag = String(body.db_tag || `DB-${String(nextIndex).padStart(2, "0")}`)
        .trim()
        .toUpperCase()
        .slice(0, 12);
      const defaultTitle = String(body.default_title || `JACK SPARROW PAID SCRIMS - ${label}`)
        .trim()
        .slice(0, 120);
      const sortOrder = body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))
        ? Math.trunc(Number(body.sort_order))
        : maxSort + 1;

      const { data: insertedRow, error: insErr } = await supabaseAdmin
        .from("lobbies")
        .insert({
          id: lobbyId,
          label,
          default_title: defaultTitle,
          db_tag: dbTag,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (insErr || !insertedRow) {
        return jsonResponse({ success: false, error: insErr?.message || "Failed to create lobby." }, 400);
      }

      let assignedUserIds: string[] = [];
      if (Array.isArray(body.assigned_user_ids) && body.assigned_user_ids.length > 0) {
        assignedUserIds = await replaceLobbyUsers(
          supabaseAdmin,
          lobbyId,
          body.assigned_user_ids,
          caller.id
        );
      }

      const usernameById = assignedUserIds.length > 0 ? await buildUsernameMap(supabaseAdmin) : {};

      return jsonResponse({
        success: true,
        lobby: {
          ...insertedRow,
          assigned_user_ids: assignedUserIds,
          assigned_usernames: assignedUserIds.map((uid) => usernameById[uid] || uid),
        },
      }, 201);
    }

    // =========================================================================
    // LOBBY UPDATE (RENAME, TAG, TITLE, SORT ORDER, ASSIGNED ADMINS)
    // =========================================================================
    if (action === "lobby_update") {
      const lobbyId = String(body.lobby_id || "").trim().toLowerCase();
      if (!LOBBY_ID_REGEX.test(lobbyId)) {
        return jsonResponse({ success: false, error: "Valid lobby_id is required." }, 400);
      }

      const { data: existingLobby, error: fetchErr } = await supabaseAdmin
        .from("lobbies")
        .select("*")
        .eq("id", lobbyId)
        .maybeSingle();

      if (fetchErr || !existingLobby) {
        return jsonResponse({ success: false, error: "Lobby not found." }, 404);
      }

      const nextLabel = body.label !== undefined
        ? String(body.label).trim().toUpperCase()
        : String(existingLobby.label);
      if (nextLabel.length < 1 || nextLabel.length > 32) {
        return jsonResponse({
          success: false,
          error: "Lobby name must be between 1 and 32 characters.",
        }, 400);
      }

      const nextDbTag = body.db_tag !== undefined
        ? String(body.db_tag).trim().toUpperCase().slice(0, 12)
        : String(existingLobby.db_tag || "");
      const nextDefaultTitle = body.default_title !== undefined
        ? String(body.default_title).trim().slice(0, 120)
        : String(existingLobby.default_title || "");
      const nextSortOrder = body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))
        ? Math.trunc(Number(body.sort_order))
        : Number(existingLobby.sort_order) || 0;

      const { data: updatedRow, error: updErr } = await supabaseAdmin
        .from("lobbies")
        .update({
          label: nextLabel,
          db_tag: nextDbTag,
          default_title: nextDefaultTitle,
          sort_order: nextSortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lobbyId)
        .select()
        .single();

      if (updErr || !updatedRow) {
        return jsonResponse({ success: false, error: updErr?.message || "Failed to update lobby." }, 400);
      }

      if (Array.isArray(body.assigned_user_ids)) {
        await replaceLobbyUsers(supabaseAdmin, lobbyId, body.assigned_user_ids, caller.id);
      }

      const [assignMaps, usernameById] = await Promise.all([
        fetchAssignmentMaps(supabaseAdmin),
        buildUsernameMap(supabaseAdmin),
      ]);
      const userIds = assignMaps.byLobby[lobbyId] || [];

      return jsonResponse({
        success: true,
        lobby: {
          ...updatedRow,
          assigned_user_ids: userIds,
          assigned_usernames: userIds.map((uid) => usernameById[uid] || uid),
        },
      });
    }

    // =========================================================================
    // LOBBY DELETE
    // =========================================================================
    if (action === "lobby_delete") {
      const lobbyId = String(body.lobby_id || "").trim().toLowerCase();
      if (!LOBBY_ID_REGEX.test(lobbyId)) {
        return jsonResponse({ success: false, error: "Valid lobby_id is required." }, 400);
      }

      const { count, error: countErr } = await supabaseAdmin
        .from("lobbies")
        .select("id", { count: "exact", head: true });

      if (countErr) {
        return jsonResponse({ success: false, error: countErr.message || "Failed to count lobbies." }, 400);
      }
      if ((count ?? 0) <= 1) {
        return jsonResponse({
          success: false,
          error: "Cannot delete the last remaining lobby. At least 1 lobby is required.",
        }, 400);
      }

      const { error: delErr } = await supabaseAdmin
        .from("lobbies")
        .delete()
        .eq("id", lobbyId);

      if (delErr) {
        return jsonResponse({ success: false, error: delErr.message || "Failed to delete lobby." }, 400);
      }

      return jsonResponse({ success: true, deletedLobbyId: lobbyId });
    }

    return jsonResponse({ success: false, error: `Unsupported action: ${action}` }, 400);
  } catch (err: any) {
    return jsonResponse({
      success: false,
      error: err?.message ? String(err.message) : "Unexpected server error.",
    }, 500);
  }
});
