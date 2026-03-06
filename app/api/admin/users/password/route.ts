import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const guacBase = () =>
  `http://${process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? "localhost:8080/guacamole"}`;

export async function PUT(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const username = p.get("username");
    const body = await request.json();

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // ── Step 1: Fetch the current user object ─────────────────────────────
    // We need the full user object to include in the PUT body.
    // ─────────────────────────────────────────────────────────────────────
    const userRes = await axios.get(
      `${guacBase()}/api/session/data/${dataSource}/users/${encodeURIComponent(username)}`,
      {
        params: { token },
        validateStatus: () => true,
      },
    );

    console.log(
      `[admin/users/password] fetch user=${username} status=${userRes.status}`,
      userRes.data ?? "",
    );

    if (userRes.status === 403) {
      return NextResponse.json(
        {
          error:
            "Permission denied — your admin session may have expired. Please log out and log in again.",
        },
        { status: 403 },
      );
    }

    if (userRes.status !== 200) {
      return NextResponse.json(
        { error: `Failed to fetch user data (status ${userRes.status})` },
        { status: 500 },
      );
    }

    // ── Step 2: PUT /users/{username} with password field ─────────────────
    // IMPORTANT: We use PUT /users/{username} (the full user update endpoint)
    // instead of PUT /users/{username}/password.
    //
    // Reason: PUT /users/{username}/password triggers Guacamole's
    // "restrict-user-password-change" guard and requires oldPassword even
    // for admins on some configurations.
    //
    // PUT /users/{username} only checks UPDATE permission (which ADMINISTER
    // implies) and does NOT trigger the password-change restriction.
    // ─────────────────────────────────────────────────────────────────────
    const changeRes = await axios.put(
      `${guacBase()}/api/session/data/${dataSource}/users/${encodeURIComponent(username)}`,
      { ...userRes.data, password: newPassword },
      {
        params: { token },
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        validateStatus: () => true,
      },
    );

    console.log(
      `[admin/users/password] update user=${username} guac_status=${changeRes.status}`,
      changeRes.data ?? "",
    );

    if (changeRes.status === 200 || changeRes.status === 204) {
      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      });
    }

    if (changeRes.status === 403) {
      return NextResponse.json(
        {
          error:
            "Permission denied — your admin session may have expired. Please log out and log in again.",
          guacMessage: changeRes.data?.message ?? "",
        },
        { status: 403 },
      );
    }

    if (changeRes.status === 400) {
      return NextResponse.json(
        {
          error:
            changeRes.data?.message ?? "Password does not meet requirements",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: changeRes.data?.message ?? "Failed to change password",
        guacStatus: changeRes.status,
      },
      { status: changeRes.status },
    );
  } catch (error: any) {
    console.error("[admin/users/password] PUT error:", error.message);
    return NextResponse.json(
      { error: "Failed to change password", details: error.message },
      { status: 500 },
    );
  }
}
