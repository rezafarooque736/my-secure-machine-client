import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function guacBase(): string {
  const url =
    process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? "localhost:8080/guacamole";
  return `http://${url}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/groups
//
// Returns all user groups from the primary dataSource.
// For each group, also fetches its memberUsers list.
//
// Query params: token, dataSource
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    // ── Fetch all groups ──────────────────────────────────────────────────
    const groupsRes = await axios.get(
      `${base}/api/session/data/${dataSource}/userGroups`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (groupsRes.status !== 200) {
      throw new Error(`Guacamole groups fetch failed: ${groupsRes.status}`);
    }

    const groupsData: Record<string, any> = groupsRes.data ?? {};

    // ── Enrich each group in parallel ─────────────────────────────────────
    const enriched = await Promise.all(
      Object.keys(groupsData).map(async (identifier) => {
        const group = groupsData[identifier];

        const [membersRes, permRes] = await Promise.all([
          axios
            .get(
              `${base}/api/session/data/${dataSource}/userGroups/${identifier}/memberUsers`,
              {
                params: { token },
                headers: { "Content-Type": "application/json" },
                validateStatus: () => true,
              },
            )
            .catch(() => null),
          axios
            .get(
              `${base}/api/session/data/${dataSource}/userGroups/${identifier}/permissions`,
              {
                params: { token },
                headers: { "Content-Type": "application/json" },
                validateStatus: () => true,
              },
            )
            .catch(() => null),
        ]);

        // Guacamole returns an ARRAY of usernames e.g. ["farooque", "guacadmin"]
        // NOT an object — so use the array directly, never Object.keys()
        const memberUsers: string[] =
          membersRes?.status === 200 && Array.isArray(membersRes.data)
            ? membersRes.data
            : [];

        const connectionIds: string[] =
          permRes?.status === 200
            ? Object.keys(permRes.data?.connectionPermissions ?? {})
            : [];

        return {
          identifier,
          disabled: group.disabled === true,
          attributes: group.attributes ?? {},
          memberUsers,
          connectionIds,
          connectionCount: connectionIds.length,
          memberCount: memberUsers.length,
        };
      }),
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("[admin/groups] GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch groups", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/groups
//
// Creates a new user group, then:
//   1. PATCHes memberUsers  if users[]        is provided
//   2. PATCHes permissions  if connections[]  is provided
//
// Body: {
//   identifier:   string          — group name (required)
//   disabled?:    boolean
//   users?:       string[]        — usernames to add as members
//   connections?: string[]        — connection IDs to grant READ
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
      identifier,
      disabled = false,
      users = [] as string[],
      connections = [] as string[],
    } = body;

    if (!identifier?.trim()) {
      return NextResponse.json(
        { error: "Group identifier is required" },
        { status: 400 },
      );
    }

    const base = guacBase();

    // ── Step 1: Create group ──────────────────────────────────────────────
    // Exact Guacamole POST body from network capture
    const createRes = await axios.post(
      `${base}/api/session/data/${dataSource}/userGroups`,
      {
        identifier: identifier.trim(),
        attributes: {},
      },
      {
        params: { token },
        headers: { "Content-Type": "application/json;charset=utf-8" },
        validateStatus: () => true,
      },
    );

    if (createRes.status !== 200 && createRes.status !== 201) {
      const msg = createRes.data?.message ?? "Failed to create group";
      return NextResponse.json({ error: msg }, { status: createRes.status });
    }

    const groupId = identifier.trim();

    // ── Step 2: If disabled, update the group ─────────────────────────────
    if (disabled) {
      await axios.put(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}`,
        { identifier: groupId, disabled: true, attributes: {} },
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );
    }

    // ── Step 3: Add member users ──────────────────────────────────────────
    if (users.length > 0) {
      const userPatches = users.map((u: string) => ({
        op: "add",
        path: "/",
        value: u,
      }));

      await axios.patch(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}/memberUsers`,
        userPatches,
        {
          params: { token },
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        },
      );
    }

    // ── Step 4: Grant READ on connections ─────────────────────────────────
    if (connections.length > 0) {
      const connPatches = connections.map((connId: string) => ({
        op: "add",
        path: `/connectionPermissions/${connId}`,
        value: "READ",
      }));

      await axios.patch(
        `${base}/api/session/data/${dataSource}/userGroups/${groupId}/permissions`,
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
        message: `Group "${groupId}" created successfully`,
        identifier: groupId,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[admin/groups] POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to create group", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/groups
//
// Query params: token, dataSource, identifier
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const identifier = p.get("identifier");

    if (!token || !identifier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();

    const deleteRes = await axios.delete(
      `${base}/api/session/data/${dataSource}/userGroups/${identifier}`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (deleteRes.status !== 200 && deleteRes.status !== 204) {
      const msg = deleteRes.data?.message ?? "Failed to delete group";
      return NextResponse.json({ error: msg }, { status: deleteRes.status });
    }

    return NextResponse.json({
      success: true,
      message: `Group "${identifier}" deleted successfully`,
    });
  } catch (error: any) {
    console.error("[admin/groups] DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete group", details: error.message },
      { status: 500 },
    );
  }
}
