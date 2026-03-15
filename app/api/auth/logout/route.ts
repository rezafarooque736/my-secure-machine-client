/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { rateLimiters } from '@/lib/rate-limit';

const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'http://localhost:8080/guacamole';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/logout
//
// Query params:
//   token      – Guacamole auth token (required)
//   sessionId  – UserSession.id to close (optional but strongly recommended)
//   username   – for the audit log (optional)
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const ipAddress = getClientIp(request);

  // Rate limiting
  const rateLimitResponse = await rateLimiters.api(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const sessionId = p.get('sessionId');
    const username = p.get('username') ?? 'unknown';

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log(`[AUTH] Logout – user: ${username} | ip: ${ipAddress}`);

    // Revoke token from Guacamole
    const guacRes = await fetch(`${GUACAMOLE_URL}/api/tokens/${token}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    const guacOk = guacRes.status < 500;
    if (!guacOk) {
      console.warn(`[AUTH] Guacamole token revocation failed: ${guacRes.status}`);
    }

    // Close UserSession record if sessionId provided
    if (sessionId) {
      try {
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
              logoutReason: 'MANUAL',
            },
          });

          console.log(`[AUTH] Session closed – id: ${sessionId} | duration: ${durationMin}m`);
        }
      } catch (sessionErr: any) {
        console.warn('[AUTH] Could not close UserSession:', sessionErr.message);
      }
    }
    // Write audit log
    await logger
      .log({
        level: 'INFO',
        category: 'AUTH',
        message: `User "${username}" logged out`,
        username,
        ipAddress,
        metadata: {
          sessionId: sessionId ?? null,
          tokenPrefix: token.substring(0, 10) + '...',
        },
      })
      .catch(() => {});

    return NextResponse.json(
      { message: 'Logged out successfully' },
      {
        headers: {
          'Set-Cookie': `guac_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
        },
      },
    );
  } catch (error: any) {
    console.error('[AUTH] Logout error:', error.message);
    return NextResponse.json({ error: 'Internal server error during logout' }, { status: 500 });
  }
}
