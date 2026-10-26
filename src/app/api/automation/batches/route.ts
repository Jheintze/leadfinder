import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { withAuth } from "@/lib/auth";

export async function GET() {
  try {
    const { data: batches, error } = await supabaseAdmin
      .from("automation_batches")
      .select(
        "id, created_at, status, target_emails, emails_found, restaurants_processed, error, city, city_exhausted, sent_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ batches: batches ?? [] });
  } catch (error) {
    console.error("[AUTOMATION BATCHES]", error);

    return NextResponse.json(
      { error: "Could not load automation batches." },
      { status: 500 },
    );
  }
}


export const DELETE = withAuth(async (request) => {
  try {
    const body = await request.json();

    // Clear completed batch history only.
    if (body.clearHistory === true) {
      const { data, error } = await supabaseAdmin
        .from("automation_batches")
        .delete()
        .in("status", ["sent", "failed"])
        .select("id");

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        deleted: data?.length ?? 0,
      });
    }

    // Remove one batch.
    const { batchId } = body;

    if (typeof batchId !== "string" || !batchId) {
      return NextResponse.json({ error: "Missing batchId." }, { status: 400 });
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("automation_batches")
      .select("id, status")
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) {
      throw batchError;
    }

    if (!batch) {
      return NextResponse.json({ error: "Batch not found." }, { status: 404 });
    }

    if (batch.status === "preparing") {
      return NextResponse.json(
        { error: "Cannot remove a batch while it is being prepared." },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("automation_batches")
      .delete()
      .eq("id", batchId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AUTOMATION BATCH DELETE]", error);

    return NextResponse.json(
      { error: "Could not delete automation batch." },
      { status: 500 },
    );
  }
});
