import { NextResponse } from "next/server";
import { prepareAutomationBatch } from "@/lib/automation";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const batch = await prepareAutomationBatch();

    return NextResponse.json({
      success: true,
      batch,
    });
  } catch (error) {
    console.error("[CRON AUTOMATION]", error);

    return NextResponse.json(
      { error: "Could not prepare automation batch." },
      { status: 500 },
    );
  }
}