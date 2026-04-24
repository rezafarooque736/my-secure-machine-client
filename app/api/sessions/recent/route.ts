/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/recent
// Query params:
//   token      – Guacamole auth token
//   dataSource – e.g. "postgresql"
//   limit      – how many to return (default: 5)
//   username   – optional: filter by a specific user
//
// Returns: RecentSession[]
// ─────────────────────────────────────────────────────────────────────────────

export interface RecentSession {
  // Identifiers
  historyEntryIdentifier: string;
  connectionId: string;
  connectionName: string;

  // Who
  username: string;

  // Protocol
  protocol: string;

  // Network
  remoteHost: string; // IP the session connected from

  // Timing
  startDate: string; // ISO string
  endDate: string | null; // ISO string or null if still active
  durationMinutes: number;
  durationFormatted: string; // "5m", "1h 23m"

  // Status
  status: 'ACTIVE' | 'DISCONNECTED';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '< 1m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function deriveStatus(record: any): 'ACTIVE' | 'DISCONNECTED' {
  // Guacamole sets endDate to null/undefined for active sessions
  if (!record.endDate) return 'ACTIVE';
  return 'DISCONNECTED';
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const usernameFilter = request.nextUrl.searchParams.get('username');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!dataSource) {
      return NextResponse.json({ error: 'dataSource is required' }, { status: 400 });
    }

    const limit = Math.min(
      50, // hard cap
      Math.max(1, parseInt(limitParam ?? '5', 10) || 5),
    );

    const baseURL = getGuacamoleApiUrl();

    // ── Step 1: Fetch all connections ─────────────────────────────────────
    const connectionsRes = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/connections`,
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    if (connectionsRes.status !== 200) {
      return NextResponse.json(
        { error: 'Failed to fetch connections', status: connectionsRes.status },
        { status: 502 },
      );
    }

    const connectionsMap: Record<string, any> = connectionsRes.data || {};
    const connectionIds = Object.keys(connectionsMap);

    // ── Step 2: Fetch history for each connection in parallel ─────────────
    const allSessions: RecentSession[] = [];

    await Promise.all(
      connectionIds.map(async (connId) => {
        try {
          const histRes = await axios.request({
            method: 'get',
            maxBodyLength: Infinity,
            url: `${baseURL}/api/session/data/${dataSource}/connections/${connId}/history`,
            params: { token },
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true,
          });

          if (histRes.status !== 200 || !histRes.data) return;

          const history: any[] = Array.isArray(histRes.data) ? histRes.data : Object.values(histRes.data);

          history.forEach((record: any) => {
            // Optional username filter (for non-admin self-view)
            if (usernameFilter && record.username !== usernameFilter) {
              return;
            }

            const startDate = new Date(record.startDate);
            const endDate = record.endDate ? new Date(record.endDate) : null;

            const now = new Date();
            const effectiveEnd = endDate ?? now;
            const durationMinutes = Math.max(
              0,
              Math.floor((effectiveEnd.getTime() - startDate.getTime()) / 60000),
            );

            allSessions.push({
              // IDs
              historyEntryIdentifier:
                record.identifier ?? record.historyEntryIdentifier ?? `${connId}-${record.startDate}`,
              connectionId: connId,
              connectionName: connectionsMap[connId]?.name ?? `Connection ${connId}`,

              // Who
              username: record.username ?? 'unknown',

              // Protocol
              protocol: (connectionsMap[connId]?.protocol ?? 'unknown').toUpperCase(),

              // Network — Guacamole stores this as remoteHost
              remoteHost: record.remoteHost ?? 'localhost',

              // Timing
              startDate: startDate.toISOString(),
              endDate: endDate ? endDate.toISOString() : null,
              durationMinutes,
              durationFormatted: formatDuration(durationMinutes),

              // Status
              status: deriveStatus(record),
            });
          });
        } catch {
          // Skip connections with no history — non-fatal
        }
      }),
    );

    // ── Step 3: Sort by most recent startDate, then slice ─────────────────
    const sorted = allSessions
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, limit);

    return NextResponse.json({
      sessions: sorted,
      total: allSessions.length, // useful for "Showing X of Y"
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch recent sessions',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
