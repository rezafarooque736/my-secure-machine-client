import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/connections/list
// Query params:
//   token      – Guacamole auth token
//   dataSource – e.g. "postgresql"
//
// Returns: Array of connection objects with `identifier` injected
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!dataSource) {
      return NextResponse.json({ error: 'dataSource is required' }, { status: 400 });
    }

    const baseURL = getGuacamoleApiUrl();

    // ── Fetch all connections from Guacamole ──────────────────────────────
    const response = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/connections`,
      params: { token },
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: 'Guacamole token invalid or expired' }, { status: 401 });
    }

    if (response.status !== 200) {
      return NextResponse.json(
        {
          error: 'Failed to fetch connections from Guacamole',
          status: response.status,
        },
        { status: 502 },
      );
    }

    const raw: Record<string, any> = response.data || {};

    // ── Transform: inject `identifier` + flatten attributes ───────────────
    const connections = Object.keys(raw)
      .map((id) => {
        const conn = raw[id];
        return {
          identifier: id,
          name: conn.name ?? '',
          protocol: conn.protocol ?? '',
          // Optional fields — present depending on Guacamole version
          hostname: conn.attributes?.['guacd-hostname'] ?? conn.parameters?.hostname ?? null,
          port: conn.attributes?.['guacd-port'] ?? conn.parameters?.port ?? null,
          activeConnections: conn.activeConnections ?? 0,
          lastActive: conn.lastActive ?? null,
        };
      })
      // Only return connections that have a name (filter orphaned entries)
      .filter((conn) => conn.name.trim().length > 0)
      // Sort alphabetically by default
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(connections);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Internal server error while fetching connections',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
