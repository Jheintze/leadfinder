import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getRestaurantsForOutreach() {
  const { data: restaurants, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, email, city")
    .not("email", "is", null)
    .eq("outreach_sent", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return restaurants ?? [];
}