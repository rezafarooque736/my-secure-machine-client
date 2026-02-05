import { NextRequest, NextResponse } from 'next/server';

const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'http://localhost:8080/guacamole';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    console.log('🔐 Login attempt for user:', username);

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

    console.log('📡 Guacamole API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Login failed:', response.status, errorData);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const data = await response.json();
    const { authToken, username: user, dataSource, availableDataSources } = data;

    if (!authToken) {
      console.error('❌ No auth token in response');
      return NextResponse.json({ error: 'Authentication failed - no token received' }, { status: 401 });
    }

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
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Internal server error during authentication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
