import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const dataSource = p.get('dataSource') ?? 'postgresql';

    if (!token || !id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = getGuacamoleApiUrl();

    const res = await axios.get(
      `${baseUrl}/api/session/data/${dataSource}/connections/${encodeURIComponent(id)}`,
      {
        params: { token },
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      },
    );

    if (res.status === 200) {
      return NextResponse.json({
        identifier: res.data.identifier,
        name: res.data.name ?? `Connection ${id}`,
        protocol: res.data.protocol ?? null,
      });
    }

    return NextResponse.json({ error: res.data?.message ?? 'Connection not found' }, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch connection', details: error.message },
      { status: 500 },
    );
  }
}
