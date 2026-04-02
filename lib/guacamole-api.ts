export function getGuacamoleApiUrl(): string {
  return process.env.GUACAMOLE_API_URL || 'http://localhost:8080/guacamole';
}
