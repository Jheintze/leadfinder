import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/auth/get-request-auth";
import { getRestaurantsForOutreach } from "@/lib/outreach/outreach-server";

export async function GET() {
  try {
    const { isDemo } = await getRequestAuth();
    const restaurants = await getRestaurantsForOutreach();

    return NextResponse.json({
      restaurants,
      isDemo,
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
