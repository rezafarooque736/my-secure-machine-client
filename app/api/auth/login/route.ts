/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validations/auth';
import { rateLimiters } from '@/lib/rate-limit';
import { z } from 'zod';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';
import { ActivityLogCategory, ActivityLogLevel } from '@/lib/generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-client-ip') ??
    'unknown'
  );
}

function parseUserAgent(ua: string) {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  if (ua.includes('Mobi') || ua.includes('Android')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
}

export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const uaMeta = parseUserAgent(userAgent);
  let username = 'unknown';

  // Rate limiting
  const rateLimitResponse = await rateLimiters.login(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const baseUrl = getGuacamoleApiUrl();

  try {
    const body = await request.json();

    // Validate input with Zod
    const validatedData = loginSchema.parse(body);
    username = validatedData.username.trim();
    const password = validatedData.password.trim();

    // Authenticate with Guacamole
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const guacRes = await fetch(`${baseUrl}/api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!guacRes.ok) {
      await prisma.loginAttempt.create({
        data: {
          username,
          success: false,
          ipAddress,
          userAgent,
          reason: 'Invalid credentials',
        },
      });

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const guacData = await guacRes.json();
    const { authToken, username: guacUsername, dataSource, availableDataSources } = guacData;

    if (!authToken) {
      return NextResponse.json({ error: 'Authentication failed – no token received' }, { status: 401 });
    }

    // Create UserSession record
    const session = await prisma.userSession.create({
      data: {
        username: guacUsername,
        clientIp: ipAddress,
        serverIp: request.headers.get('host') ?? 'unknown',
        hostname: request.headers.get('x-forwarded-host') ?? null,
        userAgent,
        isActive: true,
        metadata: JSON.stringify({
          browser: uaMeta.browser,
          os: uaMeta.os,
          device: uaMeta.device,
          dataSource,
        }),
      },
    });

    // Record successful login attempt + audit log
    await Promise.all([
      prisma.loginAttempt.create({
        data: {
          username: guacUsername,
          success: true,
          ipAddress,
          userAgent,
        },
      }),
    ]);

    prisma.activityLog.create({
      data: {
        level: ActivityLogLevel.SUCCESS,
        category: ActivityLogCategory.AUTH,
        message: `User ${guacUsername} logged in successfully`,
        username: guacUsername,
        ipAddress,
        metadata: JSON.stringify({
          sessionId: session.id,
          browser: uaMeta.browser,
          os: uaMeta.os,
          device: uaMeta.device,
          dataSource,
        }),
      },
    });

    return NextResponse.json(
      {
        authToken,
        username: guacUsername,
        dataSource: dataSource ?? 'postgresql',
        availableDataSources: availableDataSources ?? ['postgresql'],
        sessionId: session.id,
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': `guac_session=${session.id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
        },
      },
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Internal server error during authentication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
