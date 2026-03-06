import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";


// ─────────────────────────────────────────────────────────────────────────────
// Helper: verify Guacamole token + check admin role
// ─────────────────────────────────────────────────────────────────────────────

async function verifyAdmin(
  token: string,
  dataSource: string
): Promise<{ valid: boolean; username?: string; isAdmin?: boolean }> {
  try {
    const base = `http://${
      process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? "localhost:8080/guacamole"
    }`;

    const selfRes = await axios.get(
      `${base}/api/session/data/${dataSource}/self`,
      { params: { token }, validateStatus: () => true }
    );

    if (selfRes.status !== 200) return { valid: false };

    const username: string = selfRes.data?.username ?? "";

    const permRes = await axios.get(
      `${base}/api/session/data/${dataSource}/users/${username}/permissions`,
      { params: { token }, validateStatus: () => true }
    );

    const isAdmin =
      permRes.status === 200 &&
      permRes.data?.systemPermissions?.includes("ADMINISTER");

    return { valid: true, username, isAdmin };
  } catch {
    return { valid: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/audit-logs
//
// Query params:
//   token      – Guacamole auth token  (required)
//   dataSource – e.g. "mysql"          (required)
//   page       – page number           (default: 1)
//   limit      – page size             (default: 10, max: 100)
//   search     – text search across message / username / ipAddress
//   category   – AUTH | CONNECTION | SYSTEM | USER_ACTION
//   level      – INFO | SUCCESS | WARN | ERROR
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const p          = request.nextUrl.searchParams;
    const token      = p.get("token");
    const dataSource = p.get("dataSource");
    const page       = Math.max(1, parseInt(p.get("page")  ?? "1",  10));
    const limit      = Math.min(100, Math.max(1, parseInt(p.get("limit") ?? "10", 10)));
    const search     = p.get("search")   ?? "";
    const category   = p.get("category") ?? "";
    const level      = p.get("level")    ?? "";

    // ── Auth ───────────────────────────────────────────────────────────────
    if (!token || !dataSource) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = await verifyAdmin(token, dataSource);

    if (!auth.valid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // ── Build Prisma where clause ──────────────────────────────────────────
    const where: any = {};

    if (level)    where.level    = level;
    if (category) where.category = category;

    if (search.trim()) {
      where.OR = [
        { message:   { contains: search, mode: "insensitive" } },
        { username:  { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
      ];
    }

    // ── Query (parallel count + data) ─────────────────────────────────────
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // ── Statistics (always returned for admin) ────────────────────────────
    const [
      totalLogs,
      authLogs,
      connectionLogs,
      errorLogs,
      uniqueUsersRaw,
    ] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.count({ where: { category: "AUTH"       } }),
      prisma.activityLog.count({ where: { category: "CONNECTION" } }),
      prisma.activityLog.count({ where: { level:    "ERROR"      } }),
      prisma.activityLog.groupBy({ by: ["username"], _count: true }),
    ]);

    // ── Shape response ────────────────────────────────────────────────────
    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages:  Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      statistics: {
        totalLogs,
        authLogs,
        connectionLogs,
        errorLogs,
        uniqueUsers: uniqueUsersRaw.length,
      },
    });
  } catch (error: any) {
    console.error("[audit-logs] GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch audit logs", details: error.message },
      { status: 500 }
    );
  }
}
