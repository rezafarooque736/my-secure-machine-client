import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

// Create axios instance that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams);
}

async function handleProxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const method = req.method;
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams);

  const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'https://192.168.1.25';

  let body = null;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await req.json();
    } catch (e) {
      // Body might not be JSON or empty
    }
  }

  try {
    const response = await axios({
      method: method.toLowerCase(),
      url: `${GUACAMOLE_URL}/api/${path}`,
      params: searchParams, // Token will be passed as query parameter
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      httpsAgent,
      validateStatus: () => true,
    });

    return NextResponse.json(response.data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    return NextResponse.json({ error: 'Proxy request failed', details: error.message }, { status: 500 });
  }
}
