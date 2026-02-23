import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const dataSource = request.nextUrl.searchParams.get("dataSource");
    const search = request.nextUrl.searchParams.get("search") || "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || "localhost:8080/guacamole";
    const baseURL = `http://${guacamoleUrl}`;

    // Fetch all users
    const usersResponse = await axios.request({
      method: "get",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    if (usersResponse.status !== 200) {
      throw new Error("Failed to fetch users");
    }

    const usersData = usersResponse.data || {};

    // Transform users data
    const users = await Promise.all(
      Object.keys(usersData).map(async (username) => {
        try {
          // Fetch user permissions
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

          const userData = usersData[username];
          const permissions = permissionsResponse.data || {};
          const isAdmin = permissions.systemPermissions?.includes("ADMINISTER");

          const fullName = userData.attributes?.["guac-full-name"] || "";
          const email = userData.attributes?.["guac-email-address"] || "";

          return {
            id: username,
            username,
            email: email, // Only real email or empty
            firstName: fullName.split(" ")[0] || username, // For display in table
            lastName: fullName.split(" ").slice(1).join(" ") || "",
            role: isAdmin ? "ADMIN" : "USER",
            status: userData.attributes?.disabled === "true" ? "INACTIVE" : "ACTIVE",
            createdAt: new Date().toISOString(),
            lastLoginAt: userData.lastActive || new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Error fetching data for user ${username}:`, error);
          return null;
        }
      }),
    );

    // Filter out null values and apply search
    const filteredUsers = users
      .filter((user) => user !== null)
      .filter(
        (user) =>
          !search ||
          user!.username.toLowerCase().includes(search.toLowerCase()) ||
          user!.email.toLowerCase().includes(search.toLowerCase()) ||
          user!.firstName.toLowerCase().includes(search.toLowerCase()) ||
          user!.lastName.toLowerCase().includes(search.toLowerCase()),
      );

    return NextResponse.json(filteredUsers);
  } catch (error: any) {
    console.error("Users fetch error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const dataSource = request.nextUrl.searchParams.get("dataSource");
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || "localhost:8080/guacamole";
    const baseURL = `http://${guacamoleUrl}`;

    // Create new user
    const newUser = {
      username: body.username,
      password: body.password,
      attributes: {
        disabled: "",
        expired: "",
        "access-window-start": "",
        "access-window-end": "",
        "valid-from": "",
        "valid-until": "",
        timezone: null,
        "guac-full-name": `${body.firstName} ${body.lastName}`.trim(),
        "guac-email-address": body.email,
      },
    };

    const response = await axios.request({
      method: "post",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      data: newUser,
      validateStatus: () => true,
    });

    if (response.status === 200 || response.status === 201) {
      // Set permissions if admin role
      if (body.role === "ADMIN") {
        await axios.request({
          method: "patch",
          maxBodyLength: Infinity,
          url: `${baseURL}/api/session/data/${dataSource}/users/${body.username}/permissions`,
          params: { token },
          headers: {
            "Content-Type": "application/json",
          },
          data: [
            {
              op: "add",
              path: "/systemPermissions",
              value: "ADMINISTER",
            },
          ],
          validateStatus: () => true,
        });
      }

      return NextResponse.json({
        success: true,
        message: "User created successfully",
      });
    }

    throw new Error("Failed to create user");
  } catch (error: any) {
    console.error("User creation error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to create user",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const dataSource = request.nextUrl.searchParams.get("dataSource");
    const username = request.nextUrl.searchParams.get("username");

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guacamoleUrl = process.env.NEXT_PUBLIC_GUACAMOLE_URL || "localhost:8080/guacamole";
    const baseURL = `http://${guacamoleUrl}`;

    const response = await axios.request({
      method: "delete",
      maxBodyLength: Infinity,
      url: `${baseURL}/api/session/data/${dataSource}/users/${username}`,
      params: { token },
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    if (response.status === 204 || response.status === 200) {
      return NextResponse.json({
        success: true,
        message: "User deleted successfully",
      });
    }

    throw new Error("Failed to delete user");
  } catch (error: any) {
    console.error("User deletion error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to delete user",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
