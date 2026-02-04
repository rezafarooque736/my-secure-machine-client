import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const GUACAMOLE_URL = process.env.GUACAMOLE_API_URL || 'http://guacamole-api:8080/guacamole';

export async function proxyRequest(
  method: string,
  path: string,
  body: any = null,
  headers: Record<string, string> = {},
  params: Record<string, string> = {}
): Promise<AxiosResponse> {
  const url = `${GUACAMOLE_URL}/api/${path}`;
  
  // Strip host and other problematic headers
  const { host, ...safeHeaders } = headers;

  const config: AxiosRequestConfig = {
    method,
    url,
    data: body,
    params,
    headers: {
      ...safeHeaders,
      'Accept': 'application/json',
    },
    validateStatus: () => true, // Let the caller handle status codes
  };

  try {
    const response = await axios(config);
    return response;
  } catch (error: any) {
    console.error(`Proxy error [${method}] ${path}:`, error.message);
    throw error;
  }
}
