import { NextRequest, NextResponse } from 'next/server';

const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'http://localhost:8080/guacamole';

async function handleRequest(request: NextRequest, method: string) {
  try {
    const { pathname, searchParams } = new URL(request.url);

    // Extract the path after /api/proxy/
    const pathSegments = pathname.split('/api/proxy/').pop() || '';
    const targetUrl = `${GUACAMOLE_URL}/api/${pathSegments}`;

    // Build query string
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    console.log(`🔄 Proxying ${method} request to:`, fullUrl);

    // Prepare headers
    const headers: HeadersInit = {
      Accept: 'application/json',
    };

    // Only add Content-Type for requests with body
    if (method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for POST/PUT/PATCH
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const body = await request.text();
        if (body) {
          fetchOptions.body = body;
        }
      } catch (e) {
        // No body or invalid body
      }
    }

    // Make the request
    const response = await fetch(fullUrl, fetchOptions);

    console.log(`📡 Response status:`, response.status);

    // Return the response
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error(`💥 Proxy error:`, error.message);
    return NextResponse.json({ error: 'Proxy request failed', details: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request, 'PATCH');
}
