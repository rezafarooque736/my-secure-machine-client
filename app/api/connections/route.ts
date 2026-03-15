import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/connections
// Returns all connections flat array for group pickers
// Query params: token, dataSource
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const dataSource = p.get('dataSource') ?? 'mysql';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? 'localhost:8080/guacamole';
    const base = `http://${guacamoleUrl}`;

    const res = await axios.get(`${base}/api/session/data/${dataSource}/connections`, {
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
    console.error('[connections] GET error:', error.message);
    return NextResponse.json([], { status: 200 }); // non-fatal — return empty
  }
}
