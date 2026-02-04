import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

// Create axios instance that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function DELETE(req: NextRequest) {
  try {
    // Extract token from request body or query params
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'https://192.168.1.25';

    // Call Guacamole API to delete/invalidate token (logout)
    const response = await axios({
      method: 'delete',
      url: `${GUACAMOLE_URL}/api/tokens/${token}`,
      params: { token }, // Token in query parameter
      httpsAgent,
      validateStatus: () => true,
    });

    if (response.status === 204 || response.status === 200) {
      return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Logout failed' }, { status: response.status });
    }
  } catch (error: any) {
    console.error('Logout error:', error.message);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
