import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { google } from "googleapis";

export async function getRestaurantsForOutreach() {
  const { data: restaurants, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, email, city")
    .not("email", "is", null)
    .eq("outreach_sent", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return restaurants ?? [];
}

export async function sendOutreachEmail({
  restaurantId,
  to,
  subject,
  body,
}: {
  restaurantId: string;
  to: string;
  subject: string;
  body: string;
}) {
 
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

  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;

  const message = [
    `From: ${connection.email}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
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
}