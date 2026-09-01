import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code." },
      { status: 400 },
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3000/api/auth/google/callback",
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token.");
    }

    await supabaseAdmin.from("gmail_connections").insert({
      email: "jakob.webdev33@gmail.com",
      refresh_token: tokens.refresh_token,
    });

    return NextResponse.json({
      message: "Google authorization successful.",
    });
  } catch (error) {
    console.error("Google authorization failed:", error);

    return NextResponse.json(
      { error: "Google authorization failed." },
      { status: 500 },
    );
  }
}