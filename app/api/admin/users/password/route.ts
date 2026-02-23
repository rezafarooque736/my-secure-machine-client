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

    // Admin can reset password without old password
    // Get current user data first
    const getCurrentResponse = await axios.request({
      method: "get",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}/password`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    if (getCurrentResponse.status !== 200) {
      throw new Error("Failed to fetch user data");
    }

    const currentUser = getCurrentResponse.data;

    // Update user with new password
    const updateData = {
      ...currentUser,
      password: body.newPassword,
    };

    const response = await axios.request({
      method: "put",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      data: updateData,
      validateStatus: () => true,
    });

    if (response.status === 204 || response.status === 200) {
      return NextResponse.json({ success: true, message: "Password changed successfully" });
    }

    throw new Error("Failed to change password");
  } catch (error: any) {
    console.error("Password change error:", error.message);
    return NextResponse.json({ error: "Failed to change password", details: error.message }, { status: 500 });
  }
}
