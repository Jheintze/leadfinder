import { NextResponse } from "next/server";
import { findAndSaveEmails } from "@/lib/email-finder";

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
}
