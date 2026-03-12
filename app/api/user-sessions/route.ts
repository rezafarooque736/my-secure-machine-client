/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the real client IP from Next.js request headers */
function extractClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ?? // Cloudflare
    request.headers.get('x-client-ip') ??
    'unknown'
  );
}

/** Extract the server/origin IP — the outbound IP of your Next.js host */
function extractServerIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'unknown';
}

/** Parse UA string into a minimal metadata object */
function parseUserAgent(ua: string): Record<string, string> {
  const result: Record<string, string> = { raw: ua };

  // Browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) result.browser = 'Chrome';
  else if (ua.includes('Firefox')) result.browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) result.browser = 'Safari';
  else if (ua.includes('Edg')) result.browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) result.browser = 'Opera';
  else result.browser = 'Unknown';

  // OS
  if (ua.includes('Windows NT')) result.os = 'Windows';
  else if (ua.includes('Mac OS X')) result.os = 'macOS';
  else if (ua.includes('Linux')) result.os = 'Linux';
  else if (ua.includes('Android')) result.os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) result.os = 'iOS';
  else result.os = 'Unknown';

  // Device type
  if (ua.includes('Mobi') || ua.includes('Android')) result.device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) result.device = 'Tablet';
  else result.device = 'Desktop';

  return result;
}

/** Verify token is valid against Guacamole */
async function verifyGuacToken(
  token: string,
  dataSource: string,
): Promise<{ valid: boolean; username?: string; role?: string }> {
  try {
    const baseURL = `http://${process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'localhost:8080/guacamole'}`;

    const res = await axios.request({
      method: 'get',
      url: `${baseURL}/api/session/data/${dataSource}/self`,
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    if (res.status !== 200) return { valid: false };

    const username: string = res.data?.username ?? '';

    return { valid: true, username, role: 'user' };
  } catch {
    return { valid: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user-sessions
// Returns paginated user session history
//
// Query params:
//   token        – Guacamole auth token (required)
//   dataSource   – e.g. "mysql" (required)
//   username     – filter by user
//   isActive     – "true" | "false" (optional)
//   page         – page number (default: 1)
//   limit        – page size (default: 20, max: 100)
//   from         – ISO date string (optional)
//   to           – ISO date string (optional)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const dataSource = p.get('dataSource');
    const isActiveQ = p.get('isActive');
    const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '20', 10)));
    const from = p.get('from');
    const to = p.get('to');

    if (!token || !dataSource) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = await verifyGuacToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const resolvedUsername = auth.username;

    // ── Build where clause ─────────────────────────────────────────────────
    const where: any = {};

    if (resolvedUsername) {
      where.username = resolvedUsername;
    }

    if (isActiveQ !== null && isActiveQ !== undefined && isActiveQ !== '') {
      where.isActive = isActiveQ === 'true';
    }

    if (from || to) {
      where.loginTime = {};
      if (from) where.loginTime.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.loginTime.lte = toDate;
      }
    }

    // ── Query ──────────────────────────────────────────────────────────────
    const [sessions, total] = await Promise.all([
      prisma.userSession.findMany({
        where,
        orderBy: { loginTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userSession.count({ where }),
    ]);

    // ── Parse metadata JSON for each session ──────────────────────────────
    const enriched = sessions.map((s) => {
      let parsedMeta: Record<string, any> = {};
      try {
        parsedMeta = s.metadata ? JSON.parse(s.metadata) : {};
      } catch {
        parsedMeta = {};
      }

      return {
        id: s.id,
        username: s.username,
        role: s.role,

        // Network
        clientIp: s.clientIp,
        serverIp: s.serverIp,
        hostname: s.hostname,
        userAgent: s.userAgent,

        // Timing
        loginTime: s.loginTime.toISOString(),
        logoutTime: s.logoutTime?.toISOString() ?? null,
        durationMin: s.durationMin,

        // State
        isActive: s.isActive,
        logoutReason: s.logoutReason,

        // Parsed metadata: browser, os, device, etc.
        metadata: parsedMeta,
      };
    });

    return NextResponse.json({
      sessions: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error('UserSessions GET error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch user sessions', details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/user-sessions
// Called on successful login — creates a new UserSession record
//
// Body:
//   {
//     token:      string,
//     dataSource: string,
//     username:   string,
//     role:       string,
//     hostname?:  string   // optional: pre-resolved hostname
//   }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, dataSource, username, role, hostname } = body;

    if (!token || !dataSource || !username) {
      return NextResponse.json({ error: 'token, dataSource and username are required' }, { status: 400 });
    }

    // Verify the token is genuinely valid
    const auth = await verifyGuacToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ── Extract network info ───────────────────────────────────────────────
    const clientIp = extractClientIp(request);
    const serverIp = extractServerIp(request);
    const userAgent = request.headers.get('user-agent') ?? 'unknown';
    const uaMeta = parseUserAgent(userAgent);

    // ── Create session record ──────────────────────────────────────────────
    const session = await prisma.userSession.create({
      data: {
        username,
        role: role ?? auth.role ?? 'user',
        clientIp,
        serverIp,
        hostname: hostname ?? null,
        userAgent,
        isActive: true,
        metadata: JSON.stringify({
          browser: uaMeta.browser,
          os: uaMeta.os,
          device: uaMeta.device,
          // You can extend with geo data here if using a geo-IP service
        }),
      },
    });

    // ── Also write an AUTH audit log entry ────────────────────────────────
    await prisma.activityLog.create({
      data: {
        level: 'SUCCESS',
        category: 'AUTH',
        message: `User "${username}" logged in`,
        username,
        ipAddress: clientIp,
        metadata: JSON.stringify({
          sessionId: session.id,
          role: role ?? auth.role,
          browser: uaMeta.browser,
          os: uaMeta.os,
        }),
      },
    });

    return NextResponse.json(
      {
        sessionId: session.id,
        username: session.username,
        clientIp: session.clientIp,
        serverIp: session.serverIp,
        loginTime: session.loginTime.toISOString(),
        isActive: session.isActive,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('UserSessions POST error:', error.message);
    return NextResponse.json(
      { error: 'Failed to create user session', details: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/user-sessions
// Called on logout — closes the session by setting logoutTime + durationMin
//
// Body:
//   {
//     token:         string,
//     dataSource:    string,
//     sessionId:     string,   // UserSession.id (cuid)
//     logoutReason?: string    // "MANUAL" | "TIMEOUT" | "FORCED" | "EXPIRED"
//   }
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, dataSource, sessionId, logoutReason = 'MANUAL' } = body;

    if (!token || !dataSource || !sessionId) {
      return NextResponse.json({ error: 'token, dataSource and sessionId are required' }, { status: 400 });
    }

    const auth = await verifyGuacToken(token, dataSource);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ── Find the open session ──────────────────────────────────────────────
    const existing = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!existing.isActive) {
      // Already closed — idempotent response
      return NextResponse.json({
        message: 'Session already closed',
        sessionId,
        logoutTime: existing.logoutTime?.toISOString(),
      });
    }

    // ── Calculate duration ─────────────────────────────────────────────────
    const now = new Date();
    const durationMin = Math.max(0, Math.floor((now.getTime() - existing.loginTime.getTime()) / 60000));

    // ── Update the record ──────────────────────────────────────────────────
    const updated = await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        logoutTime: now,
        durationMin,
        isActive: false,
        logoutReason,
      },
    });

    // ── Write AUTH audit log ───────────────────────────────────────────────
    await prisma.activityLog.create({
      data: {
        level: 'INFO',
        category: 'AUTH',
        message: `User "${existing.username}" logged out (${logoutReason})`,
        username: existing.username,
        ipAddress: existing.clientIp,
        metadata: JSON.stringify({
          sessionId,
          durationMin,
          logoutReason,
        }),
      },
    });

    return NextResponse.json({
      sessionId,
      username: updated.username,
      loginTime: updated.loginTime.toISOString(),
      logoutTime: updated.logoutTime!.toISOString(),
      durationMin: updated.durationMin,
      logoutReason: updated.logoutReason,
      isActive: false,
    });
  } catch (error: any) {
    console.error('UserSessions PATCH error:', error.message);
    return NextResponse.json(
      { error: 'Failed to close user session', details: error.message },
      { status: 500 },
    );
  }
}
