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

  if (!city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: "Number of leads must be between 1 and 50." },
      { status: 400 },
    );
  }

  const query = {
    city,
    businessType: businessType || "Restaurant",
    limit,
  };

  try {
    const newLeads = [];
    const seenIds = new Set<string>();

    let offset = 0;
    const batchSize = limit;

    while (newLeads.length < limit) {
      const remaining = limit - newLeads.length;

      const leads = await searchLeads({
        city,
        businessType: businessType || "Restaurant",
        limit: batchSize,
        offset,
      });

      if (leads.length === 0) {
        break;
      }

      // Prevent duplicates within this search session.
      const uniqueLeads = leads.filter((lead) => {
        if (seenIds.has(lead.id)) {
          return false;
        }

        seenIds.add(lead.id);
        return true;
      });

      const sourceIds = uniqueLeads.map((lead) => lead.id);

      // Check which of these restaurants are already in Supabase.
      const { data: existingRestaurants, error: lookupError } = await supabase
        .from("restaurants")
        .select("source_id")
        .in("source_id", sourceIds);

      if (lookupError) {
        throw lookupError;
      }

      const existingIds = new Set(
        (existingRestaurants ?? []).map((restaurant) => restaurant.source_id),
      );

      const freshLeads = uniqueLeads
        .filter((lead) => !existingIds.has(lead.id))
        .slice(0, remaining);

      newLeads.push(...freshLeads);

      // Move to the next Open Places page.
      offset += leads.length;
    }

    // Save only the requested number of NEW restaurants.
    if (newLeads.length > 0) {
      const restaurants = newLeads.map((lead) => ({
        source_id: lead.id,
        name: lead.businessName,
        address: lead.location,
        website: lead.website,
        email: lead.email,
        city,
      }));

      const { error: insertError } = await supabase
        .from("restaurants")
        .upsert(restaurants, {
          onConflict: "source_id",
          ignoreDuplicates: true,
        });

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({
      leads: newLeads,
      query,
    });
  } catch (error) {
    console.error("Lead search failed", error);

    const message =
      error instanceof Error ? error.message : "Restaurant search failed.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
