import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseURL = getGuacamoleApiUrl();

    // Fetch active connections
    const sessionsResponse = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/activeConnections`,
      params: { token },
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    if (sessionsResponse.status !== 200) {
      return NextResponse.json([]);
    }

    const activeSessions = sessionsResponse.data || {};

    // Transform to array
    const sessions = Object.entries(activeSessions).map(([id, session]: [string, any]) => ({
      id,
      connectionName: session.connectionIdentifier || 'Unknown',
      protocol: session.protocol || 'unknown',
      startTime: session.startDate || new Date().toISOString(),
      username: session.username,
    }));

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error('Sessions fetch error:', error.message);
    return NextResponse.json([]);
  }
}
