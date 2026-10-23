import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("google_oauth_state")?.value;

  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set("google_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google/callback",
      maxAge: 0,
    });

    return response;
  };

  if (oauthError) {
    return clearStateCookie(
      NextResponse.json(
        { error: "Google authorization was cancelled or denied." },
        { status: 400 },
      ),
    );
  }

  if (
    !code ||
    !returnedState ||
    !cookieState ||
    returnedState !== cookieState
  ) {
    return clearStateCookie(
      NextResponse.json(
        { error: "Invalid or expired Google authorization request." },
        { status: 400 },
      ),
    );
  }

  // The state has been validated. Clear it before processing the code.
  cookieStore.delete("google_oauth_state");

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!redirectUri) {
      return NextResponse.json(
        { error: "Google OAuth is not configured." },
        { status: 500 },
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token.");
    }

    const { error: updateError } = await supabaseAdmin
      .from("gmail_connections")
      .update({ refresh_token: tokens.refresh_token })
      .eq("email", "jakob.webdev33@gmail.com");

    if (updateError) {
      throw updateError;
    }

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
