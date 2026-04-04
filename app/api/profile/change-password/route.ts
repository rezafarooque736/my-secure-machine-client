/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { changePasswordSchema } from '@/lib/validations/auth';
import { rateLimiters } from '@/lib/rate-limit';
import { z } from 'zod';
import { getGuacamoleApiUrl } from '@/lib/guacamole-api';

const baseUrl = getGuacamoleApiUrl();

async function getGuacToken(username: string, password: string): Promise<string | null> {
  try {
    const res = await axios.post(
      `${baseUrl}/api/tokens`,
      new URLSearchParams({ username, password }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
      },
    );
    return res.status === 200 && res.data?.authToken ? String(res.data.authToken) : null;
  } catch {
    return null;
  }
}

async function revokeGuacToken(token: string): Promise<void> {
  try {
    await axios.delete(`${baseUrl}/api/tokens/${token}`, {
      params: { token },
      validateStatus: () => true,
    });
  } catch {
    /* non-fatal */
  }
}

export async function PUT(request: NextRequest) {
  let freshToken: string | null = null;

  // Rate limiting
  const rateLimitResponse = await rateLimiters.api(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const p = request.nextUrl.searchParams;
    const token = p.get('token');
    const dataSource = p.get('dataSource') ?? 'mysql';
    const username = p.get('username');
    const body = await request.json();

    if (!token || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input with Zod
    const validatedData = changePasswordSchema.parse(body);
    const { oldPassword, newPassword } = validatedData;

    // Validate old password via fresh Guacamole login
    freshToken = await getGuacToken(username, oldPassword);
    if (!freshToken) {
      return NextResponse.json(
        { error: 'Current password is incorrect. Please check and try again.' },
        { status: 403 },
      );
    }

    // Change password using the fresh validated token
    const changeRes = await axios.put(
      `${baseUrl}/api/session/data/${dataSource}/users/${encodeURIComponent(username)}/password`,
      { oldPassword, newPassword },
      {
        params: { token: freshToken },
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        validateStatus: () => true,
      },
    );

    await revokeGuacToken(freshToken);
    freshToken = null;

    console.log(`[profile/change-password] user=${username} guac_status=${changeRes.status}`);

    if (changeRes.status === 200 || changeRes.status === 204) {
      return NextResponse.json({
        success: true,
        message: 'Password changed successfully',
      });
    }

    if (changeRes.status === 403) {
      return NextResponse.json(
        {
          error:
            'Your account is not permitted to change its own password. Please contact your administrator.',
          type: 'RESTRICTED',
        },
        { status: 403 },
      );
    }

    if (changeRes.status === 400) {
      return NextResponse.json(
        { error: changeRes.data?.message ?? 'Password does not meet requirements' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: changeRes.data?.message ?? 'Failed to change password', guacStatus: changeRes.status },
      { status: changeRes.status },
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    if (freshToken) await revokeGuacToken(freshToken);
    console.error('[profile/change-password] Unexpected error:', error.message);
    return NextResponse.json(
      { error: 'Failed to change password. Please try again.', details: error.message },
      { status: 500 },
    );
  }
}
