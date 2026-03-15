/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validations/auth';
import { rateLimiters } from '@/lib/rate-limit';
import { z } from 'zod';

const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'http://localhost:8080/guacamole';

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
    await logger.log({
      level: 'WARN',
      category: 'AUTH',
      message: 'Rate limit exceeded for login attempt',
      ipAddress,
      metadata: { userAgent },
    });
    return rateLimitResponse;
  }

  try {
    const body = await request.json();

    // Validate input with Zod
    const validatedData = loginSchema.parse(body);
    username = validatedData.username.trim();
    const password = validatedData.password.trim();

    console.log(`[AUTH] Login attempt – user: ${username} | ip: ${ipAddress}`);

    // Authenticate with Guacamole
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const guacRes = await fetch(`${GUACAMOLE_URL}/api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!guacRes.ok) {
      await logger.log({
        level: 'WARN',
        category: 'AUTH',
        message: `Failed login attempt for user "${username}"`,
        username,
        ipAddress,
        metadata: { status: guacRes.status, userAgent },
      });

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
      await logger.log({
        level: 'ERROR',
        category: 'AUTH',
        message: `Guacamole returned OK but no token for user "${username}"`,
        username,
        ipAddress,
      });
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

    console.log(`[AUTH] Session created – id: ${session.id} | user: ${guacUsername}`);

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
      logger.log({
        level: 'SUCCESS',
        category: 'AUTH',
        message: `User "${guacUsername}" logged in successfully`,
        username: guacUsername,
        ipAddress,
        metadata: {
          sessionId: session.id,
          browser: uaMeta.browser,
          os: uaMeta.os,
          device: uaMeta.device,
          dataSource,
        },
      }),
    ]);

    return NextResponse.json(
      {
        authToken,
        username: guacUsername,
        dataSource: dataSource ?? 'mysql',
        availableDataSources: availableDataSources ?? ['mysql'],
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
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('[AUTH] Login error:', error.message);
    await logger
      .log({
        level: 'ERROR',
        category: 'AUTH',
        message: `Login system error for user "${username}": ${error.message}`,
        username,
        ipAddress,
        metadata: { stack: error.stack },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        error: 'Internal server error during authentication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
