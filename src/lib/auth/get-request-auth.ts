import { createClient } from "@/lib/supabase/server";

export async function getRequestAuth() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }

  return {
    user,
    isDemo: !user,
  };
}
