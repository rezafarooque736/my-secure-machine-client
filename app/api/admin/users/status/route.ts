import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function PATCH(request: NextRequest) {
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

    // Get current user data
    const getCurrentResponse = await axios.request({
      method: "get",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}`,
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

    // Update disabled status
    const updateData = {
      ...currentUser,
      attributes: {
        ...currentUser.attributes,
        disabled: body.disabled ? "true" : "",
      },
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
      return NextResponse.json({
        success: true,
        message: `User ${body.disabled ? "disabled" : "enabled"} successfully`,
      });
    }

    throw new Error("Failed to update user status");
  } catch (error: any) {
    console.error("User status update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update user status", details: error.message },
      { status: 500 },
    );
  }
}
