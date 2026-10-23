import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!redirectUri) {
      return NextResponse.json(
        { error: "Google OAuth is not configured." },
        { status: 500 },
      );
    }

    const state = randomBytes(32).toString("hex");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/gmail.send"],
      state,
    });

    const response = NextResponse.redirect(authUrl);

    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google/callback",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error("[GOOGLE AUTH]", error);

    return NextResponse.json(
      { error: "Could not start Google authentication." },
      { status: 500 },
    );
  }
}
