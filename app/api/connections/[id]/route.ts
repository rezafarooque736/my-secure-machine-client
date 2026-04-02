import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const guacBase = () => `http://${process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? 'localhost:8080/guacamole'}`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const dataSource = p.get('dataSource') ?? 'mysql';

    if (!token || !id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await axios.get(
      `${guacBase}/api/session/data/${dataSource}/connections/${encodeURIComponent(id)}`,
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
