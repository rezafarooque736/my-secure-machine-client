import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const guacBase = () =>
  `http://${process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? "localhost:8080/guacamole"}`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username: rawUsername } = await params;
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const username = decodeURIComponent(rawUsername ?? "").trim();

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await axios.get(
      `${guacBase()}/api/session/data/${dataSource}/users/${encodeURIComponent(username)}/userGroups`,
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    console.log(
      `[admin/users/${username}/groups] guac_status=${res.status}`,
      Object.keys(res.data ?? {}),
    );

    if (res.status === 200) {
      let groups: string[] = [];

      if (Array.isArray(res.data)) {
        // Array of objects: [{ identifier: "test-group-1", type: "USER_GROUP" }, ...]
        groups = res.data
          .map((g: any) => String(g?.identifier ?? g?.name ?? g ?? "").trim())
          .filter(Boolean);
      } else if (res.data && typeof res.data === "object") {
        // Object map: { "test-group-1": { identifier, type }, ... }
        groups = Object.keys(res.data)
          .map((g) => g.trim())
          .filter(Boolean);
      }

      console.log(`[admin/users/${username}/groups] parsed groups:`, groups);
      return NextResponse.json({ groups });
    }

    if (res.status === 403) {
      return NextResponse.json(
        { error: "Permission denied — token may have expired" },
        { status: 403 },
      );
    }

    if (res.status === 404) {
      return NextResponse.json(
        { error: `User "${username}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: res.data?.message ?? "Failed to fetch user groups" },
      { status: res.status },
    );
  } catch (error: any) {
    console.error("[admin/users/groups] GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch user groups", details: error.message },
      { status: 500 },
    );
  }
}
