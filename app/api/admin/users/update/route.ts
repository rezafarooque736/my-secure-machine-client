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

    // Update user data
    const updateData = {
      ...currentUser,
      attributes: {
        ...currentUser.attributes,
        "guac-full-name": `${body.firstName} ${body.lastName}`.trim(),
        "guac-email-address": body.email,
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
      // Update role if changed
      if (body.role) {
        const permissionsResponse = await axios.request({
          method: "get",
          maxBodyLength: Infinity,
          url: `${baseURL}/api/session/data/${dataSource}/users/${username}/permissions`,
          params: { token },
          headers: {
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        });

        const currentPermissions = permissionsResponse.data || {};
        const isCurrentlyAdmin = currentPermissions.systemPermissions?.includes("ADMINISTER");
        const shouldBeAdmin = body.role === "ADMIN";

        if (isCurrentlyAdmin !== shouldBeAdmin) {
          await axios.request({
            method: "patch",
            maxBodyLength: Infinity,
            url: `${baseURL}/api/session/data/${dataSource}/users/${username}/permissions`,
            params: { token },
            headers: {
              "Content-Type": "application/json",
            },
            data: [
              {
                op: shouldBeAdmin ? "add" : "remove",
                path: "/systemPermissions",
                value: "ADMINISTER",
              },
            ],
            validateStatus: () => true,
          });
        }
      }

      return NextResponse.json({ success: true, message: "User updated successfully" });
    }

    throw new Error("Failed to update user");
  } catch (error: any) {
    console.error("User update error:", error.message);
    return NextResponse.json({ error: "Failed to update user", details: error.message }, { status: 500 });
  }
}
