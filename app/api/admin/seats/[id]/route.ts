import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── DELETE /api/admin/seats/[id] ───────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await prisma.guacamole_user_available_ip.delete({ where: { id: numId } });
    return NextResponse.json({ success: true, message: "IP deleted" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
