import { NextResponse } from "next/server";
import { prepareAutomationBatch } from "@/lib/automation";

export async function POST() {
  try {
    const batch = await prepareAutomationBatch();

    return NextResponse.json(batch);
  } catch (error) {
    console.error("[AUTOMATION TEST]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}