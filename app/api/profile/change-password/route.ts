import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const guacBase = () =>
  `http://${process.env.NEXT_PUBLIC_GUACAMOLE_URL ?? "localhost:8080/guacamole"}`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtain a fresh Guacamole auth token by logging in with username + password.
 * Returns the token string on success, or null if credentials are invalid.
 */
async function getGuacToken(
  username: string,
  password: string,
): Promise<string | null> {
  try {
    const res = await axios.post(
      `${guacBase()}/api/tokens`,
      new URLSearchParams({ username, password }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        validateStatus: () => true,
      },
    );
    return res.status === 200 && res.data?.authToken
      ? String(res.data.authToken)
      : null;
  } catch {
    return null;
  }
}

/** Revoke a Guacamole token — best-effort, never throws. */
async function revokeGuacToken(token: string): Promise<void> {
  try {
    await axios.delete(`${guacBase()}/api/tokens/${token}`, {
      params: { token },
      validateStatus: () => true,
    });
  } catch {
    /* non-fatal */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  let freshToken: string | null = null;

  try {
    const p = request.nextUrl.searchParams;
    const token = p.get("token");
    const dataSource = p.get("dataSource") ?? "mysql";
    const username = p.get("username");
    const body = await request.json();

    if (!token || !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current and new password are required" },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 },
      );
    }

    // ── Step 1: Validate old password via a fresh Guacamole login ────────
    // This confirms the old password is correct before attempting the change.
    // A stale session token causes false 403s on some Guacamole versions, so
    // we use a fresh token obtained by logging in with the old password.
    // ─────────────────────────────────────────────────────────────────────
    freshToken = await getGuacToken(username, oldPassword);

    if (!freshToken) {
      return NextResponse.json(
        { error: "Current password is incorrect. Please check and try again." },
        { status: 403 },
      );
    }

    // ── Step 2: Change password using the fresh validated token ──────────
    // We use the fresh token (not the stored session token) and pass BOTH
    // oldPassword and newPassword — this is the standard Guacamole self-
    // service flow that works for all user types.
    // DO NOT revoke the fresh token before this call.
    // ─────────────────────────────────────────────────────────────────────
    const changeRes = await axios.put(
      `${guacBase()}/api/session/data/${dataSource}/users/${encodeURIComponent(username)}/password`,
      { oldPassword, newPassword },
      {
        params: { token: freshToken },
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        validateStatus: () => true,
      },
    );

    // Always revoke the fresh token after the change attempt
    await revokeGuacToken(freshToken);
    freshToken = null;

    console.log(
      `[profile/change-password] user=${username} guac_status=${changeRes.status}`,
      changeRes.data ?? "",
    );

    if (changeRes.status === 200 || changeRes.status === 204) {
      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      });
    }

    // 403 here means restrict-user-password-change is enabled server-side.
    // The user's old password was correct (we verified it above), but
    // Guacamole's server policy prevents self-service password changes.
    if (changeRes.status === 403) {
      return NextResponse.json(
        {
          error:
            "Your account is not permitted to change its own password. Please contact your administrator.",
          type: "RESTRICTED",
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
    // Always revoke the fresh token on unexpected errors
    if (freshToken) await revokeGuacToken(freshToken);

    console.error("[profile/change-password] Unexpected error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to change password. Please try again.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
