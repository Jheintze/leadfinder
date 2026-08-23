import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { findEmailFromWebsite } from "@/lib/email-finder";

export async function POST() {
  try {
    const { data: restaurants, error: fetchError } = await supabase
      .from("restaurants")
      .select("id, name, website, email")
      .not("website", "is", null)
      .is("email", null)
      .limit(5);

    if (fetchError) {
      throw fetchError;
    }

    const results = [];

    for (const restaurant of restaurants ?? []) {
      if (!restaurant.website) {
        continue;
      }

      const { email } = await findEmailFromWebsite(restaurant.website);

      if (email) {
        const { error: updateError } = await supabase
          .from("restaurants")
          .update({ email })
          .eq("id", restaurant.id);

        if (updateError) {
          throw updateError;
        }
      }

      results.push({
        id: restaurant.id,
        name: restaurant.name,
        website: restaurant.website,
        email,
      });
    }

    return NextResponse.json({
      processed: results.length,
      found: results.filter((result) => result.email).length,
      results,
    });
  } catch (error) {
    console.error("Email finder failed", error);

    const message =
      error instanceof Error ? error.message : "Email finder failed.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
