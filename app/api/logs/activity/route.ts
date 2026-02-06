import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get auth info from headers (you should validate token here)
    const username = searchParams.get('username');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    if (!username || !role) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Build where clause based on role
    const where: any = {};

    // If not admin, only show their own logs
    if (role !== 'admin') {
      where.username = username;
    }

    // Apply filters
    if (level) {
      where.level = level;
    }

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.activityLog.count({ where });

    // Get paginated data
    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Get statistics (admin only)
    let statistics = null;
    if (role === 'admin') {
      const [totalLogs, authLogs, connectionLogs, errorLogs, uniqueUsers] = await Promise.all([
        prisma.activityLog.count(),
        prisma.activityLog.count({ where: { category: 'AUTH' } }),
        prisma.activityLog.count({ where: { category: 'CONNECTION' } }),
        prisma.activityLog.count({ where: { level: 'ERROR' } }),
        prisma.activityLog.groupBy({
          by: ['username'],
          _count: true,
        }),
      ]);

      statistics = {
        totalLogs,
        authLogs,
        connectionLogs,
        errorLogs,
        uniqueUsers: uniqueUsers.length,
      };
    }

    return NextResponse.json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      statistics,
    });
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs', details: error.message },
      { status: 500 },
    );
  }
}
