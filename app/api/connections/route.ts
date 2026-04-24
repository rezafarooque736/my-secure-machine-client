import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/connections
// Returns all connections flat array for group pickers
// Query params: token, dataSource
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const dataSource = p.get('dataSource') ?? 'postgresql';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = getGuacamoleApiUrl();

    const res = await axios.get(`${baseUrl}/api/session/data/${dataSource}/connections`, {
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    if (res.status !== 200) {
      return NextResponse.json([], { status: 200 }); // Return empty array, non-fatal
    }

    const data: Record<string, any> = res.data ?? {};

    const connections = Object.values(data).map((c: any) => ({
      identifier: String(c.identifier ?? ''),
      name: c.name ?? 'Unknown',
      protocol: c.protocol ?? 'rdp',
      parentIdentifier: c.parentIdentifier ?? 'ROOT',
    }));

    return NextResponse.json(connections);
  } catch (error: any) {
    return NextResponse.json([], { status: 200 }); // non-fatal — return empty
  }
}
