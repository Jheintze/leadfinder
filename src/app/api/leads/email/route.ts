import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { findEmailFromWebsite } from "@/lib/email-finder";

export async function POST(request: Request) {
  let body: { limit?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const limit =
    typeof body.limit === "number" ? body.limit : Number(body.limit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: "Number to process must be between 1 and 50." },
      { status: 400 },
    );
  }

  try {
    const { data: restaurants, error: fetchError } = await supabase
      .from("restaurants")
      .select("id, name, website, email")
      .not("website", "is", null)
      .is("email", null)
      .eq("email_checked", false)
      .limit(limit);

    if (fetchError) {
      throw fetchError;
    }

    const results = await Promise.all(
  (restaurants ?? [])
    .filter((restaurant) => restaurant.website)
    .map(async (restaurant) => {
      const { email } = await findEmailFromWebsite(restaurant.website!);

      const updateData = {
        email,
        email_checked: true,
      };

      const { error: updateError } = await supabase
        .from("restaurants")
        .update(updateData)
        .eq("id", restaurant.id);

      if (updateError) {
        throw updateError;
      }

      return {
        id: restaurant.id,
        name: restaurant.name,
        website: restaurant.website,
        email,
      };
    }),
);
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
