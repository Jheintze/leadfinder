import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("id, name, email, city")
      .not("email", "is", null)
      .eq("outreach_sent", false)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      restaurants: restaurants ?? [],
    });
  } catch (error) {
    console.error("Outreach restaurant fetch failed", error);

    const message =
      error instanceof Error
        ? error.message
        : "Could not load restaurants for outreach.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}