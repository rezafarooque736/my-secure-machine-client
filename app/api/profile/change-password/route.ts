import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function PUT(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const dataSource = request.nextUrl.searchParams.get("dataSource");
    const username = request.nextUrl.searchParams.get("username");
    const body = await request.json();

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || "localhost:8080/guacamole";
    const baseURL = `http://${guacamoleUrl}`;

    // Use Guacamole's password change endpoint
    const response = await axios.request({
      method: "put",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}/password`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        oldPassword: body.oldPassword,
        newPassword: body.newPassword,
      },
      validateStatus: () => true,
    });

    if (response.status === 204 || response.status === 200) {
      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      });
    }

    if (response.status === 403) {
      return NextResponse.json({ error: "Invalid current password" }, { status: 403 });
    }

    throw new Error("Failed to change password");
  } catch (error: any) {
    console.error("Password change error:", error.message);
    return NextResponse.json(
      {
        error: error.response?.data?.message || "Failed to change password",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
