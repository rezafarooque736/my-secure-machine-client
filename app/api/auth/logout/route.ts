import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/proxy';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log('🚪 Logout request for token:', token.substring(0, 10) + '...');

    // Call Guacamole logout endpoint
    const response = await proxyRequest('DELETE', `tokens/${token}`, null, {}, {});

    console.log('📡 Logout response status:', response.status);

    if (response.status === 204 || response.status === 200) {
      console.log('✅ Logout successful');
      return NextResponse.json({ message: 'Logged out successfully' });
    }

    return NextResponse.json({ error: 'Logout failed' }, { status: response.status || 500 });
  } catch (error: any) {
    console.error('💥 Logout error:', error.message);
    return NextResponse.json({ error: 'Internal server error during logout' }, { status: 500 });
  }
}
