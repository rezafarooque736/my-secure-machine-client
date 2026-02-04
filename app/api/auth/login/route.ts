import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import https from 'https';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Create axios instance that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // For self-signed certificates
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);
    const { username, password } = validated;

    const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'https://192.168.1.25';

    // Prepare form data as URL-encoded string
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // Call Guacamole API to get token
    const response = await axios({
      method: 'post',
      url: `${GUACAMOLE_URL}/api/tokens`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: formData.toString(),
      httpsAgent, // Accept self-signed certificates
      validateStatus: () => true, // Don't throw on any status
    });

    if (response.status === 200 && response.data.authToken) {
      const data = response.data;

      // Determine role - you can customize this logic
      const role = username === 'guacadmin' ? 'admin' : 'user';

      return NextResponse.json(
        {
          username,
          authToken: data.authToken,
          dataSource: data.dataSource || 'mysql',
          availableDataSources: data.availableDataSources || ['mysql'],
          role,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    console.error('Login error:', error.message);

    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
