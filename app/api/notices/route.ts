import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Verify token with Guacamole + check role
// ─────────────────────────────────────────────────────────────────────────────

async function verifyToken(
  token: string,
  dataSource: string
): Promise<{ valid: boolean; username?: string; role?: string }> {
  try {
    const guacamoleUrl =
      process.env.NEXT_PUBLIC_GUACAMOLE_URL || "localhost:8080/guacamole";
    const baseURL = `http://${guacamoleUrl}`;

    const res = await axios.request({
      method: "get",
      url: `${baseURL}/api/session/data/${dataSource}/self`,
      params: { token },
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });

    if (res.status !== 200) return { valid: false };

    const username: string = res.data?.username ?? "";
    // Guacamole system permissions — check if user is admin
    const permRes = await axios.request({
      method: "get",
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}/permissions`,
      params: { token },
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });

    const isAdmin =
      permRes.status === 200 &&
      permRes.data?.systemPermissions?.includes("ADMINISTER");

    return {
      valid: true,
      username,
      role: isAdmin ? "admin" : "user",
    };
  } catch {
    return { valid: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notices
// Public — returns all active, non-expired notices
// Query: ?token=&dataSource=&includeInactive=true (admin only)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const dataSource = request.nextUrl.searchParams.get("dataSource");
    const includeInactive =
      request.nextUrl.searchParams.get("includeInactive") === "true";

    if (!token || !dataSource) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token is valid (any role)
    const auth = await verifyToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Only admins can request inactive notices
    const showInactive = includeInactive && auth.role === "admin";

    const now = new Date();

    const notices = await prisma.notice.findMany({
      where: {
        ...(showInactive ? {} : { isActive: true }),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { isPinned: "desc" },   // pinned notices always on top
        { createdAt: "desc" },  // newest first
      ],
    });

    return NextResponse.json({ notices, total: notices.length });
  } catch (error: any) {
    console.error("Notices GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch notices", details: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notices
// Admin only — create a new notice
// Body: { token, dataSource, title, content, type?, isPinned?, expiresAt? }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      dataSource,
      title,
      content,
      type = "INFO",
      isPinned = false,
      expiresAt = null,
    } = body;

    if (!token || !dataSource) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate inputs
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    const VALID_TYPES = ["INFO", "WARNING", "SUCCESS", "UPDATE"];
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Auth — admin only
    const auth = await verifyToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const notice = await prisma.notice.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        type,
        isPinned: Boolean(isPinned),
        isActive: true,
        createdBy: auth.username,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error: any) {
    console.error("Notices POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to create notice", details: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notices
// Admin only — update an existing notice
// Body: { token, dataSource, id, title?, content?, type?,
//         isPinned?, isActive?, expiresAt? }
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      dataSource,
      id,
      title,
      content,
      type,
      isPinned,
      isActive,
      expiresAt,
    } = body;

    if (!token || !dataSource) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json(
        { error: "notice id is required" },
        { status: 400 }
      );
    }

    // Auth — admin only
    const auth = await verifyToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check notice exists
    const existing = await prisma.notice.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    // Build update payload — only include defined fields
    const updateData: Record<string, any> = {};
    if (title !== undefined)     updateData.title     = title.trim();
    if (content !== undefined)   updateData.content   = content.trim();
    if (type !== undefined)      updateData.type      = type;
    if (isPinned !== undefined)  updateData.isPinned  = Boolean(isPinned);
    if (isActive !== undefined)  updateData.isActive  = Boolean(isActive);
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const updated = await prisma.notice.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({ notice: updated });
  } catch (error: any) {
    console.error("Notices PATCH error:", error.message);
    return NextResponse.json(
      { error: "Failed to update notice", details: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notices
// Admin only — hard delete a notice
// Body: { token, dataSource, id }
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, dataSource, id } = body;

    if (!token || !dataSource) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json(
        { error: "notice id is required" },
        { status: 400 }
      );
    }

    // Auth — admin only
    const auth = await verifyToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check notice exists
    const existing = await prisma.notice.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    await prisma.notice.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    console.error("Notices DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete notice", details: error.message },
      { status: 500 }
    );
  }
}
