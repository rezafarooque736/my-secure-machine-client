import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function guacBase(): string {
  const url =
    process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? "localhost:8080/guacamole";
  return `http://${url}`;
}

function ds(dataSource: string) {
  return dataSource || "mysql";
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
//
// Returns all users from BOTH data sources (mysql + mysql-shared),
// deduped by username. For each user fetches their permissions to determine
// the admin role. Status is read from the TOP-LEVEL `disabled` boolean.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const search = p.get("search")?.toLowerCase() ?? "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    // ── Fetch users from primary dataSource ──────────────────────────────
    const usersRes = await axios.get(
      `${base}/api/session/data/${ds(dataSource)}/users`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (usersRes.status !== 200) {
      throw new Error(`Guacamole users fetch failed: ${usersRes.status}`);
    }

    const usersData: Record<string, any> = usersRes.data ?? {};

    // ── Enrich each user with permissions ────────────────────────────────
    const enriched = await Promise.all(
      Object.keys(usersData).map(async (username) => {
        try {
          const userData = usersData[username];

          const permRes = await axios.get(
            `${base}/api/session/data/${ds(dataSource)}/users/${username}/permissions`,
            {
              params: { token },
              headers: { "Content-Type": "application/json" },
              validateStatus: () => true,
            },
          );

          const perms = permRes.status === 200 ? permRes.data : {};
          const connectionIds: string[] = Object.keys(
            perms.connectionPermissions ?? {},
          );
          const isAdmin =
            perms.systemPermissions?.includes("ADMINISTER") ?? false;

          const fullName: string =
            userData.attributes?.["guac-full-name"] ?? "";

          const nameParts = fullName.trim().split(" ");

          // ── FIXED: disabled is TOP-LEVEL, not inside attributes ────────
          const isDisabled: boolean = userData.disabled === true;

          return {
            username,
            fullName: fullName || null,
            firstName: nameParts[0] ?? username,
            lastName: nameParts.slice(1).join(" ") ?? "",
            email: userData.attributes?.["guac-email-address"] ?? null,
            organization: userData.attributes?.["guac-organization"] ?? null,
            organizationalRole:
              userData.attributes?.["guac-organizational-role"] ?? null,
            role: isAdmin ? "ADMIN" : "USER",
            status: isDisabled ? "INACTIVE" : "ACTIVE",
            lastLoginAt: userData.lastActive
              ? new Date(userData.lastActive).toISOString()
              : null,
            attributes: userData.attributes ?? {},
            connectionIds,
          };
        } catch {
          return null;
        }
      }),
    );

    let users = enriched.filter(Boolean) as any[];

    // ── Apply search filter ───────────────────────────────────────────────
    if (search) {
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(search) ||
          u.fullName?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.organization?.toLowerCase().includes(search),
      );
    }

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("[admin/users] GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch users", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/users
//
// Creates a new Guacamole user, then:
//   1. PATCHes ADMINISTER permission if role === "ADMIN"
//   2. PATCHes userGroups if groups[] is provided
//
// Body: {
//   username, password,
//   fullName?, email?, organization?, organizationalRole?,
//   role?: "ADMIN" | "USER",
//   groups?: string[]            ← group identifiers to assign
// }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      username,
      password,
      fullName = "",
      email = "",
      organization = "",
      organizationalRole = "",
      role = "USER",
      groups = [] as string[],
      connections = [] as string[],
    } = body;

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const base = guacBase();

    // ── Step 1: Create user ───────────────────────────────────────────────
    // Exact body format Guacamole expects (from network captures)
    const createBody = {
      username: username.trim(),
      password: password.trim(),
      attributes: {
        expired: "",
        "access-window-start": "",
        "access-window-end": "",
        "valid-from": "",
        "valid-until": "",
        timezone: null,
        "guac-full-name": fullName.trim() || "",
        "guac-email-address": email.trim() || "",
        "guac-organization": organization.trim() || "",
        "guac-organizational-role": organizationalRole.trim() || "",
      },
    };

    const createRes = await axios.post(
      `${base}/api/session/data/${ds(dataSource)}/users`,
      createBody,
      {
        params: { token },
        headers: { "Content-Type": "application/json;charset=utf-8" },
        validateStatus: () => true,
      },
    );

    if (createRes.status !== 200 && createRes.status !== 201) {
      const msg = createRes.data?.message ?? "Failed to create user";
      return NextResponse.json({ error: msg }, { status: createRes.status });
    }

    const createdUsername: string = createRes.data?.username ?? username.trim();

    // ── Step 2: Set ADMINISTER permission for admin role ──────────────────
    if (role === "ADMIN") {
      await axios.patch(
        `${base}/api/session/data/${ds(dataSource)}/users/${createdUsername}/permissions`,
        [{ op: "add", path: "/systemPermissions", value: "ADMINISTER" }],
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );
    }

    // ── Step 3: Assign to groups ──────────────────────────────────────────
    if (groups.length > 0) {
      const groupPatches = groups.map((g: string) => ({
        op: "add",
        path: "/",
        value: g,
      }));

      await axios.patch(
        `${base}/api/session/data/${ds(dataSource)}/users/${createdUsername}/userGroups`,
        groupPatches,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );
    }

    if (connections && connections.length > 0) {
      const connPatches = connections.map((c: string) => ({
        op: "add",
        path: `/connectionPermissions/${c}`,
        value: "READ",
      }));
      await axios.patch(
        `${base}/api/session/data/${ds(dataSource)}/users/${createdUsername}/permissions`,
        connPatches,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        username: createdUsername,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[admin/users] POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to create user", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/users
//
// Updates an existing user's profile attributes + optionally role + groups.
//
// Query params: token, dataSource, username
// Body: {
//   fullName?, email?, organization?, organizationalRole?,
//   role?: "ADMIN" | "USER",
//   groups?: string[]   ← full new group list (replaces existing)
// }
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const username = p.get("username");
    const body = await request.json();

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    // ── Fetch current user data ───────────────────────────────────────────
    const currentRes = await axios.get(
      `${base}/api/session/data/${ds(dataSource)}/users/${username}`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (currentRes.status !== 200) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUser = currentRes.data;

    // ── Step 1: Update attributes ─────────────────────────────────────────
    const updateBody = {
      ...currentUser,
      attributes: {
        ...currentUser.attributes,
        "guac-full-name":
          body.fullName ?? currentUser.attributes?.["guac-full-name"] ?? "",
        "guac-email-address":
          body.email ?? currentUser.attributes?.["guac-email-address"] ?? "",
        "guac-organization":
          body.organization ??
          currentUser.attributes?.["guac-organization"] ??
          "",
        "guac-organizational-role":
          body.organizationalRole ??
          currentUser.attributes?.["guac-organizational-role"] ??
          "",
      },
    };

    const updateRes = await axios.put(
      `${base}/api/session/data/${ds(dataSource)}/users/${username}`,
      updateBody,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (updateRes.status !== 200 && updateRes.status !== 204) {
      throw new Error("Failed to update user attributes");
    }

    // ── Step 2: Update role permission ────────────────────────────────────
    if (body.role !== undefined) {
      const permRes = await axios.get(
        `${base}/api/session/data/${ds(dataSource)}/users/${username}/permissions`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );

      const currentlyAdmin =
        permRes.status === 200 &&
        permRes.data?.systemPermissions?.includes("ADMINISTER");

      const shouldBeAdmin = body.role === "ADMIN";

      if (currentlyAdmin !== shouldBeAdmin) {
        await axios.patch(
          `${base}/api/session/data/${ds(dataSource)}/users/${username}/permissions`,
          [
            {
              op: shouldBeAdmin ? "add" : "remove",
              path: "/systemPermissions",
              value: "ADMINISTER",
            },
          ],
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        );
      }
    }

    // ── Step 3: Update group memberships ──────────────────────────────────
    if (Array.isArray(body.groups)) {
      // Fetch current groups
      const currentGroupsRes = await axios.get(
        `${base}/api/session/data/${ds(dataSource)}/users/${username}/userGroups`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );

      const rawData = currentGroupsRes.data;
      let currentGroups: string[] = [];
      if (currentGroupsRes.status === 200) {
        if (Array.isArray(rawData)) {
          currentGroups = rawData
            .map((g: any) => String(g?.identifier ?? g?.name ?? g ?? "").trim())
            .filter(Boolean);
        } else if (rawData && typeof rawData === "object") {
          currentGroups = Object.keys(rawData)
            .map((g) => g.trim())
            .filter(Boolean);
        }
      }

      const newGroups: string[] = body.groups;

      const toAdd = newGroups.filter((g) => !currentGroups.includes(g));
      const toRemove = currentGroups.filter((g) => !newGroups.includes(g));

      const patches = [
        ...toAdd.map((g) => ({ op: "add", path: "/", value: g })),
        ...toRemove.map((g) => ({ op: "remove", path: "/", value: g })),
      ];

      if (patches.length > 0) {
        await axios.patch(
          `${base}/api/session/data/${ds(dataSource)}/users/${username}/userGroups`,
          patches,
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        );
      }
    }

    // ── Step 4: Update connection permissions ─────────────────────────────
    if (Array.isArray(body.connections)) {
      // Fetch current permissions to diff
      const currentPermRes = await axios.get(
        `${base}/api/session/data/${ds(dataSource)}/users/${username}/permissions`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );

      const currentConnIds: string[] =
        currentPermRes.status === 200
          ? Object.keys(currentPermRes.data?.connectionPermissions ?? {})
          : [];

      const newConnIds: string[] = body.connections;

      const toAdd = newConnIds.filter((c) => !currentConnIds.includes(c));
      const toRemove = currentConnIds.filter((c) => !newConnIds.includes(c));

      const patches = [
        ...toAdd.map((c) => ({
          op: "add",
          path: `/connectionPermissions/${c}`,
          value: "READ",
        })),
        ...toRemove.map((c) => ({
          op: "remove",
          path: `/connectionPermissions/${c}`,
          value: "READ",
        })),
      ];

      if (patches.length > 0) {
        await axios.patch(
          `${base}/api/session/data/${ds(dataSource)}/users/${username}/permissions`,
          patches,
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error: any) {
    console.error("[admin/users] PUT error:", error.message);
    return NextResponse.json(
      { error: "Failed to update user", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users
//
// Toggles disabled status — sets the TOP-LEVEL `disabled` field correctly.
//
// Query params: token, dataSource, username
// Body: { disabled: boolean }
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const username = p.get("username");
    const body = await request.json();

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    // Fetch current user
    const currentRes = await axios.get(
      `${base}/api/session/data/${ds(dataSource)}/users/${username}`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (currentRes.status !== 200) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUser = currentRes.data;

    // ── FIXED: disabled is TOP-LEVEL, not in attributes ───────────────────
    const updateBody = {
      ...currentUser,
      disabled: body.disabled === true,
    };

    const updateRes = await axios.put(
      `${base}/api/session/data/${ds(dataSource)}/users/${username}`,
      updateBody,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (updateRes.status !== 200 && updateRes.status !== 204) {
      throw new Error("Failed to update user status");
    }

    return NextResponse.json({
      success: true,
      message: `User ${body.disabled ? "disabled" : "enabled"} successfully`,
    });
  } catch (error: any) {
    console.error("[admin/users] PATCH error:", error.message);
    return NextResponse.json(
      { error: "Failed to update user status", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users
//
// Query params: token, dataSource, username
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const username = p.get("username");

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    const deleteRes = await axios.delete(
      `${base}/api/session/data/${ds(dataSource)}/users/${username}`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (deleteRes.status !== 200 && deleteRes.status !== 204) {
      const msg = deleteRes.data?.message ?? "Failed to delete user";
      return NextResponse.json({ error: msg }, { status: deleteRes.status });
    }

    return NextResponse.json({
      success: true,
      message: `User "${username}" deleted successfully`,
    });
  } catch (error: any) {
    console.error("[admin/users] DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete user", details: error.message },
      { status: 500 },
    );
  }
}
