import { NextResponse } from 'next/server';

export async function GET() {
  // Optional: check database connectivity
  // const dbOk = await prisma.$queryRaw`SELECT 1`.catch(() => false);
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
