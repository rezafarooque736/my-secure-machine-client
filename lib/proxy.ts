const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'http://localhost:8080/guacamole';

export async function proxyRequest(
  method: string,
  path: string,
  body: any = null,
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
): Promise<Response> {
  const url = new URL(`${GUACAMOLE_URL}/api/${path}`);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);
    return response;
  } catch (error: any) {
    console.error(`Proxy error [${method}] ${path}:`, error.message);
    throw error;
  }
}
