import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');
    const username = request.nextUrl.searchParams.get('username');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseURL = getGuacamoleApiUrl();

    // Fetch all connections
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
    const connectionIds = Object.keys(connections);

    // Collect all history records
    const allHistory: any[] = [];

    await Promise.all(
      connectionIds.map(async (connId) => {
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

            history.forEach((record: any) => {
              allHistory.push({
                ...record,
                protocol: connections[connId].protocol,
              });
            });
          }
        } catch (error) {
          // Skip connections with no history
        }
      }),
    );

    // Filter by username if provided
    const userHistory = username ? allHistory.filter((record) => record.username === username) : allHistory;

    // Calculate statistics
    const totalSessions = userHistory.length;
    let totalDuration = 0;
    const protocolMap = new Map<string, { count: number; duration: number }>();
    const dailyMap = new Map<string, { sessions: number; duration: number }>();

    userHistory.forEach((record: any) => {
      const startDate = new Date(record.startDate);
      const endDate = record.endDate ? new Date(record.endDate) : new Date();
      const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);

      if (duration > 0) {
        totalDuration += duration;
      }

      // Protocol stats
      const protocol = (record.protocol || 'unknown').toUpperCase();
      const current = protocolMap.get(protocol) || { count: 0, duration: 0 };
      protocolMap.set(protocol, {
        count: current.count + 1,
        duration: current.duration + (duration > 0 ? duration : 0),
      });

      // Daily stats (last 7 days)
      const dateKey = startDate.toISOString().split('T')[0];
      const dailyCurrent = dailyMap.get(dateKey) || { sessions: 0, duration: 0 };
      dailyMap.set(dateKey, {
        sessions: dailyCurrent.sessions + 1,
        duration: dailyCurrent.duration + (duration > 0 ? duration : 0),
      });
    });

    const averageDuration = totalSessions > 0 ? Math.floor(totalDuration / totalSessions) : 0;

    // Get most used protocol
    let mostUsedProtocol = 'N/A';
    let maxCount = 0;
    protocolMap.forEach((value, key) => {
      if (value.count > maxCount) {
        maxCount = value.count;
        mostUsedProtocol = key;
      }
    });

    // Format protocol usage
    const protocolUsage = Array.from(protocolMap.entries()).map(([protocol, stats]) => ({
      protocol,
      count: stats.count,
      duration: stats.duration,
    }));

    // Format session history (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const sessionHistory = last7Days.map((date) => ({
      date,
      sessions: dailyMap.get(date)?.sessions || 0,
      duration: dailyMap.get(date)?.duration || 0,
    }));

    // Active today count
    const today = new Date().toISOString().split('T')[0];
    const activeToday = dailyMap.get(today)?.sessions || 0;

    // Last login
    const sortedHistory = [...userHistory].sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
    const lastLogin =
      sortedHistory.length > 0
        ? new Date(sortedHistory[0].startDate).toISOString()
        : new Date().toISOString();

    return NextResponse.json({
      totalSessions,
      totalDuration,
      averageDuration,
      lastLogin,
      mostUsedProtocol,
      activeToday,
      protocolUsage,
      sessionHistory,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch activity statistics',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
