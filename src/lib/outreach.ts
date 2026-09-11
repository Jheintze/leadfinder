import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type OutreachTemplate = {
  subject: string;
  body: string;
};

export type OutreachDraft = OutreachTemplate & {
  restaurantId: string;
  restaurantName: string;
  email: string;
};

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

export function generateOutreachDrafts(
  restaurants: {
    id: string;
    name: string;
    email: string;
  }[],
  template: OutreachTemplate,
): OutreachDraft[] {
  return restaurants.map((restaurant) => ({
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    email: restaurant.email,
    subject: template.subject.replaceAll(
      "{restaurant_name}",
      restaurant.name,
    ),
    body: template.body.replaceAll(
      "{restaurant_name}",
      restaurant.name,
    ),
  }));
}