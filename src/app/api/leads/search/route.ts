import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/auth/get-request-auth";
import { searchAndSaveRestaurants } from "@/lib/restaurant-search/restaurant-search";

type SearchRequest = {
  city?: unknown;
  businessType?: unknown;
  limit?: unknown;
};

export async function POST(request: Request) {

 const { isDemo } = await getRequestAuth();

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

  const requestedLimit =
    typeof body.limit === "number" ? body.limit : Number(body.limit);

  if (!city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  if (city.length > 100) {
    return NextResponse.json(
      { error: "City name must be 100 characters or fewer." },
      { status: 400 },
    );
  }

  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1 ||
    requestedLimit > 50
  ) {
    return NextResponse.json(
      { error: "Number of leads must be between 1 and 50." },
      { status: 400 },
    );
  }

  const limit = isDemo ? Math.min(requestedLimit, 5) : requestedLimit;

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

    return NextResponse.json(
      { error: "Restaurant search failed. Please try again." },
      { status: 502 },
    );
  }
}
