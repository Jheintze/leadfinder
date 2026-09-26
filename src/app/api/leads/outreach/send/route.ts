import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { sendOutreachEmail } from "@/lib/outreach/outreach-server";

export const POST = withAuth(async (request) => {
  try {
    const { restaurantId, to, subject, body } = await request.json();

    if (!restaurantId || !to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing email data." },
        { status: 400 },
      );
    }

    await sendOutreachEmail({
      restaurantId,
      to,
      subject,
      body,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Email send failed:", error);

    const message =
      error instanceof Error ? error.message : "Could not send email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
});
