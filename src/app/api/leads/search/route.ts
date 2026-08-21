import { searchLeads } from "@/lib/lead-search";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type SearchRequest = {
  city?: unknown;
  businessType?: unknown;
  limit?: unknown;
};

export async function POST(request: Request) {
  let body: SearchRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const city = typeof body.city === "string" ? body.city.trim() : "";
  const businessType =
    typeof body.businessType === "string"
      ? body.businessType.trim()
      : "Restaurant";
  const limit =
    typeof body.limit === "number" ? body.limit : Number(body.limit);

  if (!city)
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    return NextResponse.json(
      { error: "Number of leads must be between 1 and 50." },
      { status: 400 },
    );

  const query = { city, businessType: businessType || "Restaurant", limit };
  try {
    const candidates = await searchLeads(query);

    const candidateIds = candidates.map((lead) => lead.id);

    const { data: existingRestaurants, error: existingError } = await supabase
      .from("restaurants")
      .select("source_id")
      .in("source_id", candidateIds);

    if (existingError) {
      throw existingError;
    }

    const existingIds = new Set(
      (existingRestaurants ?? []).map((restaurant) => restaurant.source_id),
    );

    const newLeads = candidates
      .filter((lead) => !existingIds.has(lead.id))
      .slice(0, limit);

    const restaurants = newLeads.map((lead) => ({
      source_id: lead.id,
      name: lead.businessName,
      address: lead.location,
      website: lead.website,
      email: lead.email,
      city,
    }));

    if (restaurants.length > 0) {
      const { error: insertError } = await supabase
        .from("restaurants")
        .insert(restaurants);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ leads: newLeads, query });
  } catch (error) {
    console.error("Lead search failed", error);

    const message =
      error instanceof Error ? error.message : "Restaurant search failed.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
