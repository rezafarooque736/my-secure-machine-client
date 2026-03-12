/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
//
// Body: { username: string, password: string }
//
// 1. Authenticates against Guacamole /api/tokens
// 2. Creates a UserSession record in Prisma
// 3. Writes an ActivityLog AUTH SUCCESS entry
// 4. Returns { authToken, username, dataSource, availableDataSources, role, sessionId }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const uaMeta = parseUserAgent(userAgent);

  let username = 'unknown';

  try {
    const body = await request.json();
    username = (body.username ?? '').trim();
    const password = (body.password ?? '').trim();

    // ── Input validation ───────────────────────────────────────────────────
    if (!username || !password) {
      await logger.log({
        level: 'WARN',
        category: 'AUTH',
        message: 'Login attempt with missing credentials',
        ipAddress,
        metadata: { userAgent },
      });

      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    console.log(`[AUTH] Login attempt — user: ${username} | ip: ${ipAddress}`);

    // ── Step 1: Authenticate with Guacamole ────────────────────────────────
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const guacRes = await fetch(`${GUACAMOLE_URL}/api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!guacRes.ok) {
      // Log failed attempt
      await logger.log({
        level: 'WARN',
        category: 'AUTH',
        message: `Failed login attempt for user "${username}"`,
        username,
        ipAddress,
        metadata: { status: guacRes.status, userAgent },
      });

      // Record failed login attempt in DB
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

      return NextResponse.json({ error: 'Authentication failed — no token received' }, { status: 401 });
    }

    const role = 'user';

    // ── Step 3: Create UserSession record ──────────────────────────────────
    const session = await prisma.userSession.create({
      data: {
        username: guacUsername,
        role,
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

    console.log(`[AUTH] Session created — id: ${session.id} | user: ${guacUsername} | role: ${role}`);

    // ── Step 4: Record successful login attempt + audit log ────────────────
    await Promise.all([
      // LoginAttempt record
      prisma.loginAttempt.create({
        data: {
          username: guacUsername,
          success: true,
          ipAddress,
          userAgent,
        },
      }),

      // ActivityLog / Audit entry
      logger.log({
        level: 'SUCCESS',
        category: 'AUTH',
        message: `User "${guacUsername}" logged in successfully`,
        username: guacUsername,
        ipAddress,
        metadata: {
          sessionId: session.id,
          role,
          browser: uaMeta.browser,
          os: uaMeta.os,
          device: uaMeta.device,
          dataSource,
        },
      }),
    ]);

    // ── Step 5: Return auth response ───────────────────────────────────────
    return NextResponse.json(
      {
        authToken,
        username: guacUsername,
        dataSource: dataSource ?? 'mysql',
        availableDataSources: availableDataSources ?? ['mysql'],
        role,

        // Include sessionId so the client can call PATCH /api/user-sessions
        // on logout to close the session record
        sessionId: session.id,
      },
      { status: 200 },
    );
  } catch (error: any) {
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
      .catch(() => {}); // never let logging crash the response

    return NextResponse.json(
      {
        error: 'Internal server error during authentication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
