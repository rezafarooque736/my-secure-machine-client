/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');
    const username = request.nextUrl.searchParams.get('username');

    if (!token || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseURL = getGuacamoleApiUrl();

    const userResponse = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${encodeURIComponent(username)}`,
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    if (userResponse.status !== 200) {
      throw new Error('Failed to fetch user data');
    }

    const userData = userResponse.data || {};

    return NextResponse.json({
      username: userData.username,
      email: userData.attributes?.['guac-email-address'] ?? null,
      fullName: userData.attributes?.['guac-full-name'] ?? null,
      organization: userData.attributes?.['guac-organization'] ?? null,
      organizationalRole: userData.attributes?.['guac-organizational-role'] ?? null,
      lastActive: userData.lastActive ? new Date(userData.lastActive).toISOString() : null,
      accountCreated: null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch profile', details: error.message }, { status: 500 });
  }
}
