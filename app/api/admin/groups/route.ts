import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'localhost:8080/guacamole';
    const baseURL = `http://${guacamoleUrl}`;

    // Fetch all connection groups
    const groupsResponse = await axios.get(`${baseURL}/api/session/data/${dataSource}/connectionGroups`, {
      params: { token },
      validateStatus: () => true,
    });

    // Fetch user groups
    const userGroupsResponse = await axios.get(`${baseURL}/api/session/data/${dataSource}/userGroups`, {
      params: { token },
      validateStatus: () => true,
    });

    const connectionGroups = groupsResponse.data || {};
    const userGroups = userGroupsResponse.data || {};

    // Transform connection groups
    const transformedConnectionGroups = Object.keys(connectionGroups).map((id) => {
      const group = connectionGroups[id];
      return {
        id,
        name: group.name,
        description: group.attributes?.description || '',
        memberCount: group.childConnections?.length || 0,
        connectionCount: group.childConnections?.length || 0,
        createdAt: new Date().toISOString(),
        type: 'ORGANIZATIONAL' as const,
      };
    });

    // Transform user groups
    const transformedUserGroups = Object.keys(userGroups).map((id) => {
      const group = userGroups[id];
      return {
        id,
        name: group.identifier || id,
        description: 'User group',
        memberCount: group.memberUsers?.length || 0,
        connectionCount: 0,
        createdAt: new Date().toISOString(),
        type: 'USER' as const,
      };
    });

    const allGroups = [...transformedConnectionGroups, ...transformedUserGroups];

    return NextResponse.json(allGroups);
  } catch (error: any) {
    console.error('Groups fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch groups', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const dataSource = request.nextUrl.searchParams.get('dataSource');
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'localhost:8080/guacamole';
    const baseURL = `http://${guacamoleUrl}`;

    // Create new connection group
    const newGroup = {
      parentIdentifier: 'ROOT',
      name: body.name,
      type: 'ORGANIZATIONAL',
      attributes: {
        'max-connections': '',
        'max-connections-per-user': '',
        'enable-session-affinity': '',
        description: body.description,
      },
    };

    const response = await axios.post(
      `${baseURL}/api/session/data/${dataSource}/connectionGroups`,
      newGroup,
      {
        params: { token },
        validateStatus: () => true,
      },
    );

    if (response.status === 200 || response.status === 201) {
      return NextResponse.json({ success: true, message: 'Group created successfully' });
    }

    throw new Error('Failed to create group');
  } catch (error: any) {
    console.error('Group creation error:', error.message);
    return NextResponse.json({ error: 'Failed to create group', details: error.message }, { status: 500 });
  }
}
