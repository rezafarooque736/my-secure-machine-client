import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const dataSource = request.nextUrl.searchParams.get("dataSource");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || "localhost:8080/guacamole";
    const baseURL = `http://${guacamoleUrl}`;

    // Fetch active sessions
    const sessionsResponse = await axios.request({
      method: "get",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/activeConnections`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    const activeSessions =
      sessionsResponse.status === 200 ? Object.keys(sessionsResponse.data || {}).length : 0;

    // Fetch all connections to calculate usage
    const connectionsResponse = await axios.request({
      method: "get",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/connections`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    const connections = connectionsResponse.data || {};
    const connectionIds = Object.keys(connections);

    // Calculate total usage from connection histories
    let totalMinutes = 0;
    let totalSessions = 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    await Promise.all(
      connectionIds.map(async (connId) => {
        try {
          const historyResponse = await axios.request({
            method: "get",
            maxBodyLength: Infinity,
            url: `${baseURL}/api/session/data/${dataSource}/connections/${connId}/history`,
            params: { token },
            headers: {
              "Content-Type": "application/json",
            },
            validateStatus: () => true,
          });

          if (historyResponse.status === 200 && historyResponse.data) {
            const history = Array.isArray(historyResponse.data)
              ? historyResponse.data
              : Object.values(historyResponse.data);

            history.forEach((record: any) => {
              const startDate = new Date(record.startDate);
              if (startDate >= firstDayOfMonth) {
                totalSessions++;
                const endDate = record.endDate ? new Date(record.endDate) : new Date();
                const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
                totalMinutes += duration > 0 ? duration : 0;
              }
            });
          }
        } catch (error) {
          // Skip connections with no history
        }
      }),
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return NextResponse.json({
      activeSessions,
      totalUsage: hours > 0 || minutes > 0 ? `${hours}h ${minutes}m` : "0h",
      totalUsageMinutes: totalMinutes,
      connectionCount: totalSessions,
      accountStatus: "Active",
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard statistics",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
