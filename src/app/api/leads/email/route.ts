import { NextResponse } from "next/server";
import { findAndSaveEmails } from "@/lib/email-search/email-finder";
import { getRequestAuth } from "@/lib/auth/get-request-auth";

export async function POST(request: Request) {

  const { isDemo } = await getRequestAuth();

  let body: { limit?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const requestedLimit =
    typeof body.limit === "number" ? body.limit : Number(body.limit);

  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1 ||
    requestedLimit > 50
  ) {
    return NextResponse.json(
      { error: "Number to process must be between 1 and 50." },
      { status: 400 },
    );
  }
  const limit = isDemo ? Math.min(requestedLimit, 5) : requestedLimit;

  try {
    const results = await findAndSaveEmails({ limit });

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
};
