import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'http://localhost:8080/guacamole';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
  );
}

export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      await logger.logAuthFailure(username || 'unknown', ipAddress, 'Missing credentials');
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    console.log('🔐 Login attempt for user:', username, 'from IP:', ipAddress);

    // Create form-urlencoded data
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // Make direct fetch call to Guacamole
    const response = await fetch(`${GUACAMOLE_URL}/api/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      // Log failed attempt
      await logger.logAuthFailure(username, ipAddress, 'Invalid credentials');

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

    const data = await response.json();
    const { authToken, username: user, dataSource, availableDataSources } = data;

    if (!authToken) {
      await logger.logAuthFailure(username, ipAddress, 'No token received');
      return NextResponse.json({ error: 'Authentication failed - no token received' }, { status: 401 });
    }

    // Log successful login
    await logger.logAuthSuccess(user, ipAddress);

    await prisma.loginAttempt.create({
      data: {
        username: user,
        success: true,
        ipAddress,
        userAgent,
      },
    });

    console.log('✅ Login successful for user:', user);

    return NextResponse.json({
      authToken,
      username: user,
      dataSource: dataSource || 'mysql',
      availableDataSources: availableDataSources || ['mysql'],
      role: user === 'guacadmin' ? 'admin' : 'user',
    });
  } catch (error: any) {
    console.error('💥 Login error:', error.message);
    await logger.log({
      level: 'ERROR',
      category: 'AUTH',
      message: 'Login system error',
      ipAddress,
      metadata: { error: error.message },
    });

    return NextResponse.json(
      {
        error: 'Internal server error during authentication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
