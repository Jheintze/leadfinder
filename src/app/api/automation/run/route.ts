import { NextResponse } from "next/server";
import { prepareAutomationBatch } from "@/lib/automation";
import { requireUser } from "@/lib/auth";

export async function POST() {
  
  try {
    await requireUser();
    const batch = await prepareAutomationBatch();

    return NextResponse.json({
      success: true,
      batch,
    });
  } catch (error) {
    console.error("[AUTOMATION RUN]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not prepare automation batch.",
      },
      { status: 500 },
    );
  }
}