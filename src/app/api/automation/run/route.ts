import { NextResponse } from "next/server";

import { prepareAutomationBatch } from "@/lib/automation";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async () => {
  try {
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
});