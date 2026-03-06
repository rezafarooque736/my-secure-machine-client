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
// GET /api/admin/active-sessions
//
// Fetches active connections from ALL available data sources
// (availableDataSources comes from the login response stored in Zustand).
// Falls back to querying both "mysql" and "mysql-shared" if not provided.
//
// Query params:
//   token              – required
//   dataSource         – primary dataSource (e.g. "mysql")
//   allDataSources     – comma-separated list (e.g. "mysql,mysql-shared")
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const allDsRaw = p.get("allDataSources") ?? dataSource;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = guacBase();
    const dataSources = Array.from(
      new Set(
        allDsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );

    // ── Fetch active connections from all data sources in parallel ─────────
    const results = await Promise.allSettled(
      dataSources.map(async (ds) => {
        const res = await axios.get(
          `${base}/api/session/data/${ds}/activeConnections`,
          {
            params: { token },
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
          },
        );

        if (res.status !== 200) return [];

        const data: Record<string, any> = res.data ?? {};

        return Object.entries(data).map(([connectionId, session]) => ({
          // Unique key across data sources
          id: `${ds}:${connectionId}`,
          connectionId,
          dataSource: ds,

          // Session info
          username: session.username ?? "unknown",
          remoteHost: session.remoteHost ?? null,
          startDate: session.startDate
            ? new Date(session.startDate).toISOString()
            : null,

          // Connection info
          connectionName: session.connectionIdentifier ?? connectionId,
          connectionIdentifier: session.connectionIdentifier ?? connectionId,
          protocol: session.protocol ?? "unknown",

          // Duration in seconds
          duration: session.startDate
            ? Math.floor((Date.now() - session.startDate) / 1000)
            : 0,
        }));
      }),
    );

    // ── Merge all results ─────────────────────────────────────────────────
    const sessions: any[] = [];
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        sessions.push(...result.value);
      }
    });

    // ── Resolve protocol from connection config (activeConnections has no protocol) ──
    const sessionsWithProtocol = await Promise.all(
      sessions.map(async (session) => {
        if (session.protocol && session.protocol !== "unknown") return session;
        try {
          const connRes = await axios.get(
            `${base}/api/session/data/${session.dataSource}/connections/${session.connectionIdentifier}`,
            {
              params: { token },
              headers: { "Content-Type": "application/json" },
              validateStatus: () => true,
            },
          );
          if (connRes.status === 200 && connRes.data?.protocol) {
            return { ...session, protocol: connRes.data.protocol };
          }
        } catch {}
        return session;
      }),
    );
    // Replace sessions array with enriched one
    sessions.length = 0;
    sessions.push(...sessionsWithProtocol);

    // Sort by startDate descending (most recent first)
    sessions.sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return NextResponse.json({
      sessions,
      total: sessions.length,
      dataSources: dataSources,
    });
  } catch (error: any) {
    console.error("[admin/active-sessions] GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch active sessions", details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/active-sessions
//
// Kills (terminates) an active connection.
// Guacamole uses PATCH with op "remove" on the activeConnections endpoint.
//
// Query params:
//   token          – required
//   dataSource     – which dataSource the connection lives in
//   connectionId   – the active connection ID to kill
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const connectionId = p.get("connectionId");

    if (!token || !connectionId) {
      return NextResponse.json(
        { error: "token and connectionId are required" },
        { status: 400 },
      );
    }

    const base = guacBase();

    // Guacamole terminates active connections via PATCH with op "remove"
    const killRes = await axios.patch(
      `${base}/api/session/data/${dataSource}/activeConnections`,
      [{ op: "remove", path: `/${connectionId}` }],
      {
        params: { token },
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (killRes.status !== 200 && killRes.status !== 204) {
      return NextResponse.json(
        {
          error: killRes.data?.message ?? "Failed to terminate session",
        },
        { status: killRes.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Session "${connectionId}" terminated successfully`,
    });
  } catch (error: any) {
    console.error("[admin/active-sessions] DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to terminate session", details: error.message },
      { status: 500 },
    );
  }
}
