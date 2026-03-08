import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function nextIp(ip: string): string {
  const p = ip.split(".").map(Number);
  for (let i = 3; i >= 0; i--) {
    p[i] += 1;
    if (p[i] <= 255) break;
    p[i] = 0;
  }
  return p.join(".");
}

const IPv4 =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

// ── GET /api/admin/ips ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const ips = await prisma.guacamole_user_available_ip.findMany({
      orderBy: [{ group_name: "asc" }, { ip: "asc" }],
    });
    return NextResponse.json({ success: true, data: ips });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST /api/admin/ips ───────────────────────────────────────────────────────
// Body: { count, allocations: [{ amount, group_name, firstIp?, gateway }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count, allocations } = body;

    const totalAllocated: number = allocations.reduce(
      (s: number, a: any) => s + (a.amount || 0),
      0,
    );
    if (totalAllocated !== count) {
      return NextResponse.json(
        {
          error: `Total allocations (${totalAllocated}) must equal count (${count})`,
        },
        { status: 400 },
      );
    }

    const toCreate: Array<{
      ip: string;
      group_name: string;
      gateway: string | null;
    }> = [];

    for (const alloc of allocations) {
      const { amount, group_name, firstIp, gateway } = alloc;
      if (!group_name) {
        return NextResponse.json(
          { error: "group_name is required" },
          { status: 400 },
        );
      }

      let current: string = firstIp || "10.0.0.1";
      if (!IPv4.test(current)) {
        return NextResponse.json(
          { error: `Invalid firstIp: ${current}` },
          { status: 400 },
        );
      }

      for (let i = 0; i < amount; i++) {
        toCreate.push({
          ip: current,
          group_name,
          gateway: gateway || null,
        });
        current = nextIp(current);
      }
    }

    await prisma.guacamole_user_available_ip.createMany({
      data: toCreate,
      skipDuplicates: true,
    });

    return NextResponse.json(
      { success: true, message: `${toCreate.length} IP(s) created` },
      { status: 201 },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── PUT /api/admin/ips ────────────────────────────────────────────────────────
// Body: [{ id, ip, group_name, gateway }]
export async function PUT(request: NextRequest) {
  try {
    const updates: Array<{
      id: number;
      ip: string;
      group_name: string;
      gateway?: string | null;
    }> = await request.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.guacamole_user_available_ip.update({
          where: { id: u.id },
          data: {
            ip: u.ip,
            group_name: u.group_name,
            gateway: u.gateway || null,
          },
        }),
      ),
    );

    return NextResponse.json({ success: true, message: "IPs updated" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
