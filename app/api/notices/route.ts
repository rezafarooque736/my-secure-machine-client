import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Verify token with Guacamole
// ─────────────────────────────────────────────────────────────────────────────

async function verifyToken(
  token: string,
  dataSource: string,
): Promise<{ valid: boolean; username?: string }> {
  try {
    const baseURL = getGuacamoleApiUrl();

    const res = await axios.request({
      method: 'get',
      url: `${baseURL}/api/session/data/${dataSource}/self`,
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    if (res.status !== 200) return { valid: false };

    const username: string = res.data?.username ?? '';

    return {
      valid: true,
      username,
    };
  } catch {
    return { valid: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notices
// Public — returns all active, non-expired notices
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');

    if (!token || !dataSource) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token is valid
    const auth = await verifyToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const now = new Date();

    const notices = await prisma.notice.findMany({
      where: {
        ...{ isActive: true },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [
        { isPinned: 'desc' }, // pinned notices always on top
        { createdAt: 'desc' }, // newest first
      ],
    });

    return NextResponse.json({ notices, total: notices.length });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Notices GET error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch notices', details: error.message }, { status: 500 });
  }
}
