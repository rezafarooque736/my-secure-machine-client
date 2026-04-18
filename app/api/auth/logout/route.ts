import { getGuacamoleApiUrl } from '@/lib/guacamole-api';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimiters } from '@/lib/rate-limit';
import { UserSessionLogoutReason } from '@/lib/generated/prisma/enums';

const baseUrl = getGuacamoleApiUrl();

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/logout
//
// Query params:
//   token      – Guacamole auth token (required)
//   sessionId  – UserSession.id to close (optional but strongly recommended)
//   username   – for the audit log (optional)
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await rateLimiters.api(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const sessionId = p.get('sessionId');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Revoke token from Guacamole
    await fetch(`${baseUrl}/api/tokens/${token}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    // Close UserSession record if sessionId provided
    if (sessionId) {
      const existing = await prisma.userSession.findUnique({
        where: { id: sessionId },
      });

      if (existing && existing.isActive) {
        const now = new Date();
        const durationMin = Math.max(0, Math.floor((now.getTime() - existing.loginTime.getTime()) / 60000));

        await prisma.userSession.update({
          where: { id: sessionId },
          data: {
            logoutTime: now,
            durationMin,
            isActive: false,
            logoutReason: UserSessionLogoutReason.MANUAL,
          },
        });
      }
    }

    return NextResponse.json(
      { message: 'Logged out successfully' },
      {
        headers: {
          'Set-Cookie': `guac_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error during logout' }, { status: 500 });
  }
}
