/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');
    const username = request.nextUrl.searchParams.get('username');

    if (!token || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'localhost:8080/guacamole';
    const baseURL = `http://${guacamoleUrl}`;

    // Fetch user details
    const userResponse = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}`,
      params: { token },
      headers: {
        'Content-Type': 'application/json',
      },
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
      role: 'user',
      lastActive: userData.lastActive ? new Date(userData.lastActive).toISOString() : null,
      accountCreated: null,
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');
    const username = request.nextUrl.searchParams.get('username');
    const body = await request.json();

    if (!token || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'localhost:8080/guacamole';
    const baseURL = `http://${guacamoleUrl}`;

    // Get current user data first
    const getCurrentResponse = await axios.request({
      method: 'get',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}`,
      params: { token },
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    const currentUser = getCurrentResponse.data || {};

    // Update user attributes - use full name directly
    const updateData = {
      ...currentUser,
      attributes: {
        ...currentUser.attributes,
        'guac-full-name': body.fullName || '',
        'guac-email-address': body.email || '',
        'guac-organization': body.organization || '',
        'guac-organizational-role': body.organizationalRole || '',
      },
    };

    const response = await axios.request({
      method: 'put',
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}`,
      params: { token },
      headers: {
        'Content-Type': 'application/json',
      },
      data: updateData,
      validateStatus: () => true,
    });

    if (response.status === 204 || response.status === 200) {
      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
      });
    }

    throw new Error('Failed to update profile');
  } catch (error: any) {
    console.error('Profile update error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to update profile',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
