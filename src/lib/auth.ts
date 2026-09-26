import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return user;
}

export function withAuth(
  handler: () => Promise<NextResponse>,
) {
  return async () => {
    try {
      await requireUser();

      return await handler();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      }

      throw error;
    }
  };
}