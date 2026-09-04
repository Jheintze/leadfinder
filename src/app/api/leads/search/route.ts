import { NextResponse } from "next/server";
import { searchAndSaveRestaurants } from "@/lib/restaurant-search";

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
    const newLeads = await searchAndSaveRestaurants({
      city,
      businessType: businessType || "Restaurant",
      limit,
    });

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