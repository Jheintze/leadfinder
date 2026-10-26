import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

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
