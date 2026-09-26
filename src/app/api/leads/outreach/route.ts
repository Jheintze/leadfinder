import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth";
import { getRestaurantsForOutreach } from "@/lib/outreach-server";

export const GET = withAuth(async () => {
  try {
    const restaurants = await getRestaurantsForOutreach();

    return NextResponse.json({
      restaurants,
    });
  } catch (error) {
    console.error("Outreach restaurant fetch failed", error);

    const message =
      error instanceof Error
        ? error.message
        : "Could not load restaurants for outreach.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
});
