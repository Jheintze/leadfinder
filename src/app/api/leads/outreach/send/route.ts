import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { restaurantId, to, subject, body } = await request.json();

    if (!restaurantId || !to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing email data." },
        { status: 400 },
      );
    }

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("gmail_connections")
      .select("email, refresh_token")
      .limit(1)
      .single();

    if (connectionError || !connection) {
      throw connectionError ?? new Error("No Gmail connection found.");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3000/api/auth/google/callback",
    );

    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const message = [
      `From: ${connection.email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");

    const raw = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
      },
    });

    const { error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ outreach_sent: true })
      .eq("id", restaurantId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Email send failed:", error);

    const message =
      error instanceof Error ? error.message : "Could not send email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}