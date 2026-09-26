import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateOutreachDrafts } from "@/lib/outreach";
import {
  getRestaurantsForOutreach,
  sendOutreachEmail,
} from "@/lib/outreach-server";
import { withAuth } from "@/lib/auth";
import { OUTREACH_SUBJECT, OUTREACH_BODY } from "@/lib/outreach-template";

export const POST = withAuth(async (request) => {
  try {
    const { batchId } = await request.json();

    if (!batchId) {
      return NextResponse.json({ error: "Missing batchId." }, { status: 400 });
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("automation_batches")
      .select("id, status, restaurant_ids")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      throw batchError ?? new Error("Batch not found.");
    }

    if (batch.status !== "ready") {
      return NextResponse.json(
        { error: "This batch is not ready to send." },
        { status: 400 },
      );
    }

    const restaurants = await getRestaurantsForOutreach(batch.restaurant_ids);

    const drafts = generateOutreachDrafts(restaurants, {
      subject: OUTREACH_SUBJECT,
      body: OUTREACH_BODY,
    });

    for (const draft of drafts) {
      await sendOutreachEmail({
        restaurantId: draft.restaurantId,
        to: "dr.nick@gmx.net",
        subject: draft.subject,
        body: draft.body,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("automation_batches")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      sent: drafts.length,
    });
  } catch (error) {
    console.error("[AUTOMATION SEND]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send automation batch.",
      },
      { status: 500 },
    );
  }
});
