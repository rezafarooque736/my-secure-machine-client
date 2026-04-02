import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseURL = getGuacamoleApiUrl();

    // Fetch all connections first
    const connectionsResponse = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/connections`,
      params: { token },
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    if (connectionsResponse.status !== 200) {
      throw new Error('Failed to fetch connections');
    }

    const connections = connectionsResponse.data || {};
    const recentConnections: any[] = [];

    // Fetch history for each connection
    const connectionIds = Object.keys(connections);

    await Promise.all(
      connectionIds.slice(0, 20).map(async (connId) => {
        try {
          const historyResponse = await axios.request({
            method: 'get',
            maxBodyLength: Infinity,
            url: `${baseURL}/api/session/data/${dataSource}/connections/${connId}/history`,
            params: { token },
            headers: {
              'Content-Type': 'application/json',
            },
            validateStatus: () => true,
          });

          if (historyResponse.status === 200 && historyResponse.data) {
            const history = Array.isArray(historyResponse.data)
              ? historyResponse.data
              : Object.values(historyResponse.data);

            if (history.length > 0) {
              // Get the most recent session
              const mostRecent = history.reduce((prev: any, current: any) => {
                const prevDate = new Date(prev.startDate || 0);
                const currentDate = new Date(current.startDate || 0);
                return currentDate > prevDate ? current : prev;
              });

              const startDate = new Date(mostRecent.startDate);
              const endDate = mostRecent.endDate ? new Date(mostRecent.endDate) : new Date();
              const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);

              recentConnections.push({
                identifier: connId,
                name: connections[connId].name,
                protocol: connections[connId].protocol,
                lastUsed: mostRecent.startDate,
                duration: duration > 0 ? duration : 0,
                timestamp: startDate.getTime(),
              });
            }
          }
        } catch (error) {
          // Skip connections with no history
          console.log(`No history for connection ${connId}`);
        }
      }),
    );

    // Sort by most recent and limit
    const sortedRecent = recentConnections
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(({ timestamp, ...rest }) => rest);

    return NextResponse.json(sortedRecent);
  } catch (error: any) {
    console.error('Recent connections error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to fetch recent connections',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
