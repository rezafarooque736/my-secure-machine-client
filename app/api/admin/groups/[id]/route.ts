import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

function guacBase(): string {
  const url =
    process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? "localhost:8080/guacamole";
  return `http://${url}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/groups/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const groupId = decodeURIComponent(id ?? "");

    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";

    if (!token || !groupId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    // ── Parallel fetch all group details ──────────────────────────────────
    const [groupRes, membersRes, memberGroupsRes, permRes] = await Promise.all([
      axios.get(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      ),
      axios.get(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}/memberUsers`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      ),
      axios.get(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}/memberUserGroups`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      ),
      axios.get(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}/permissions`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      ),
    ]);

    if (groupRes.status !== 200) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = groupRes.data;

    // Guacamole returns ARRAY of usernames — use directly, never Object.keys()
    const memberUsers: string[] =
      membersRes.status === 200 && Array.isArray(membersRes.data)
        ? membersRes.data
        : [];

    // memberUserGroups is also an array of group identifier strings
    const memberGroups: string[] =
      memberGroupsRes.status === 200 && Array.isArray(memberGroupsRes.data)
        ? memberGroupsRes.data
        : [];

    const perms = permRes.status === 200 ? permRes.data : {};

    return NextResponse.json({
      identifier: group.identifier,
      disabled: group.disabled === true,
      attributes: group.attributes ?? {},
      memberUsers,
      memberGroups,
      permissions: {
        connectionPermissions: perms.connectionPermissions ?? {},
        systemPermissions: perms.systemPermissions ?? [],
        connectionIds: Object.keys(perms.connectionPermissions ?? {}),
      },
    });
  } catch (error: any) {
    console.error("[admin/groups/[id]] GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch group", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/groups/[id]
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const groupId = decodeURIComponent(id);
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    const [currentGroupRes, currentMembersRes, currentPermRes] =
      await Promise.all([
        axios.get(
          `${base}/api/session/data/${dataSource}/userGroups/${groupId}`,
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        ),
        axios.get(
          `${base}/api/session/data/${dataSource}/userGroups/${groupId}/memberUsers`,
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        ),
        axios.get(
          `${base}/api/session/data/${dataSource}/userGroups/${groupId}/permissions`,
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        ),
      ]);

    if (currentGroupRes.status !== 200) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const currentGroup = currentGroupRes.data;

    const currentMembers: string[] =
      currentMembersRes.status === 200 && Array.isArray(currentMembersRes.data)
        ? currentMembersRes.data
        : [];

    const currentConnIds: string[] =
      currentPermRes.status === 200
        ? Object.keys(currentPermRes.data?.connectionPermissions ?? {})
        : [];

    const updateRes = await axios.put(
      `${base}/api/session/data/${dataSource}/userGroups/${groupId}`,
      {
        ...currentGroup,
        disabled: body.disabled ?? currentGroup.disabled,
        attributes: currentGroup.attributes ?? {},
      },
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (updateRes.status !== 200 && updateRes.status !== 204) {
      throw new Error("Failed to update group");
    }

    if (Array.isArray(body.users)) {
      const newUsers: string[] = body.users;
      const toAdd = newUsers.filter((u) => !currentMembers.includes(u));
      const toRemove = currentMembers.filter((u) => !newUsers.includes(u));

      const patches = [
        ...toAdd.map((u) => ({ op: "add", path: "/", value: u })),
        ...toRemove.map((u) => ({ op: "remove", path: "/", value: u })),
      ];

      if (patches.length > 0) {
        await axios.patch(
          `${base}/api/session/data/${dataSource}/userGroups/${groupId}/memberUsers`,
          patches,
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        );
      }
    }

    if (Array.isArray(body.connections)) {
      const newConns: string[] = body.connections;
      const toAdd = newConns.filter((c) => !currentConnIds.includes(c));
      const toRemove = currentConnIds.filter((c) => !newConns.includes(c));

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
          `${base}/api/session/data/${dataSource}/userGroups/${groupId}/permissions`,
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
      message: `Group "${groupId}" updated successfully`,
    });
  } catch (error: any) {
    console.error("[admin/groups/[id]] PUT error:", error.message);
    return NextResponse.json(
      { error: "Failed to update group", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/groups/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let groupId = "unknown";
  try {
    const { id } = await context.params;
    groupId = decodeURIComponent(id ?? "");

    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";

    if (!token || !groupId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    // ── Step 1: Remove all member users ──────────────────────────────────
    const membersRes = await axios.get(
      `${base}/api/session/data/${dataSource}/userGroups/${groupId}/memberUsers`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (membersRes.status === 200) {
      const memberKeys = Object.keys(membersRes.data ?? {});
      if (memberKeys.length > 0) {
        await axios.patch(
          `${base}/api/session/data/${dataSource}/userGroups/${groupId}/memberUsers`,
          memberKeys.map((u) => ({ op: "remove", path: "/", value: u })),
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        );
      }
    }

    // ── Step 2: Remove all connection permissions ─────────────────────────
    const permRes = await axios.get(
      `${base}/api/session/data/${dataSource}/userGroups/${groupId}/permissions`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (permRes.status === 200) {
      const connIds = Object.keys(permRes.data?.connectionPermissions ?? {});
      if (connIds.length > 0) {
        await axios.patch(
          `${base}/api/session/data/${dataSource}/userGroups/${groupId}/permissions`,
          connIds.map((c) => ({
            op: "remove",
            path: `/connectionPermissions/${c}`,
            value: "READ",
          })),
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        );
      }
    }

    // ── Step 3: Try Guacamole REST delete ─────────────────────────────────
    const deleteRes = await axios.delete(
      `${base}/api/session/data/${dataSource}/userGroups/${groupId}`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    console.log(
      "[DELETE group] guac REST status:",
      deleteRes.status,
      deleteRes.data,
    );

    if (deleteRes.status === 204 || deleteRes.status === 200) {
      return NextResponse.json({
        success: true,
        message: `Group "${groupId}" deleted successfully`,
        method: "rest",
      });
    }

    // ── Step 4: REST failed → try direct MariaDB delete via docker exec ───
    console.log(
      "[DELETE group] REST failed, attempting direct DB delete via docker exec...",
    );

    const dbName = process.env.DB_NAME ?? "guacamole_db";
    const dbUser = process.env.DB_USER ?? "root";
    const dbPass = process.env.DB_PASSWORD ?? "";
    const container = process.env.DB_CONTAINER_NAME ?? "guacdb";

    // Sanitize groupId — only allow alphanumeric, hyphens, underscores
    // to prevent SQL injection via the group name
    const safeGroupId = groupId.replace(/[^a-zA-Z0-9_\-]/g, "");
    if (safeGroupId !== groupId) {
      console.warn(
        "[DELETE group] groupId sanitized:",
        groupId,
        "→",
        safeGroupId,
      );
    }

    const sql = `DELETE FROM guacamole_entity WHERE name='${safeGroupId}' AND type='USER_GROUP';`;

    const dockerCmd = [
      "docker",
      "exec",
      container,
      "mariadb",
      `-u${dbUser}`,
      `-p${dbPass}`,
      dbName,
      "-e",
      `"${sql}"`,
    ].join(" ");

    console.log(
      "[DELETE group] running docker exec SQL for group:",
      safeGroupId,
    );

    const { stdout, stderr } = await execAsync(dockerCmd);

    if (stderr && !stderr.toLowerCase().includes("warning")) {
      // MariaDB prints a password warning to stderr — ignore it
      throw new Error(`DB exec error: ${stderr}`);
    }

    console.log("[DELETE group] docker exec SQL success:", stdout);

    return NextResponse.json({
      success: true,
      message: `Group "${groupId}" deleted via direct DB (Guacamole REST bug GUACAMOLE-2088)`,
      method: "db",
    });
  } catch (error: any) {
    console.error(
      "[DELETE group] all delete methods failed for",
      groupId,
      ":",
      error.message,
    );

    // ── Step 5: Last resort — disable the group via Guacamole REST ────────
    try {
      const p = request.nextUrl.searchParams;
      const token = p.get("token");
      const dataSource = p.get("dataSource") ?? "mysql";
      const base = guacBase();

      const currentRes = await axios.get(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}`,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );

      await axios.put(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}`,
        {
          ...(currentRes.data ?? {}),
          identifier: groupId,
          disabled: true,
          attributes: currentRes.data?.attributes ?? {},
        },
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );

      console.log("[DELETE group] fallback: group disabled instead of deleted");

      return NextResponse.json(
        {
          success: false,
          warning: true,
          message: `Group "${groupId}" could not be deleted (Guacamole bug) — it has been disabled instead. Delete it manually from the database.`,
          method: "disabled",
          originalError: error.message,
        },
        { status: 207 }, // 207 Multi-Status — partial success
      );
    } catch (disableError: any) {
      console.error(
        "[DELETE group] fallback disable also failed:",
        disableError.message,
      );
      return NextResponse.json(
        {
          error: "Failed to delete group",
          details: error.message,
          disableError: disableError.message,
        },
        { status: 500 },
      );
    }
  }
}
