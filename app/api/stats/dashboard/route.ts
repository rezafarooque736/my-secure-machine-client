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

    // ── 1. Active sessions ──────────────────────────────────────────────────
    const sessionsResponse = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/activeConnections`,
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    const activeSessions =
      sessionsResponse.status === 200 ? Object.keys(sessionsResponse.data || {}).length : 0;

    // ── 2. All connections ──────────────────────────────────────────────────
    const connectionsResponse = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/connections`,
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    const connections = connectionsResponse.data || {};
    const connectionIds = Object.keys(connections);

    // ── 3. Time boundaries ──────────────────────────────────────────────────
    const now = new Date();

    // Start of today (midnight local)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // ── 4. Walk all connection histories ────────────────────────────────────
    let totalMinutesToday = 0;
    let totalMinutesMonth = 0;
    let totalSessionsToday = 0;
    let totalSessionsMonth = 0;

    await Promise.all(
      connectionIds.map(async (connId) => {
        try {
          const historyResponse = await axios.request({
            method: 'get',
            maxBodyLength: Infinity,
            url: `${baseURL}/api/session/data/${dataSource}/connections/${connId}/history`,
            params: { token },
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true,
          });

          if (historyResponse.status === 200 && historyResponse.data) {
            const history: any[] = Array.isArray(historyResponse.data)
              ? historyResponse.data
              : Object.values(historyResponse.data);

            history.forEach((record: any) => {
              const startDate = new Date(record.startDate);
              const endDate = record.endDate ? new Date(record.endDate) : new Date();
              const duration = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 60000));

              // Month bucket
              if (startDate >= startOfMonth) {
                totalSessionsMonth++;
                totalMinutesMonth += duration;
              }

              // Today bucket
              if (startDate >= startOfToday) {
                totalSessionsToday++;
                totalMinutesToday += duration;
              }
            });
          }
        } catch {
          // skip connections with no history
        }
      }),
    );

    // ── 5. Format helpers ───────────────────────────────────────────────────
    const formatDuration = (minutes: number): string => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h === 0 && m === 0) return '0m';
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    };

    // ── 6. Total connections available ──────────────────────────────────────
    const totalConnections = connectionIds.length;

    return NextResponse.json({
      // Existing fields (kept for backward compat)
      activeSessions,
      totalUsage: formatDuration(totalMinutesMonth),
      totalUsageMinutes: totalMinutesMonth,
      connectionCount: totalSessionsMonth,
      accountStatus: 'Active',

      // New granular fields
      totalConnections,

      totalUsageToday: formatDuration(totalMinutesToday),
      totalUsageTodayMinutes: totalMinutesToday,
      totalSessionsToday,

      totalUsageMonth: formatDuration(totalMinutesMonth),
      totalUsageMonthMinutes: totalMinutesMonth,
      totalSessionsMonth,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard statistics',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
