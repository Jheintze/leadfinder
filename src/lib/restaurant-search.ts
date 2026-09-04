import { searchLeads } from "@/lib/lead-search";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SearchAndSaveInput = {
  city: string;
  businessType: string;
  limit: number;
};

export async function searchAndSaveRestaurants({
  city,
  businessType,
  limit,
}: SearchAndSaveInput) {


    const newLeads = [];
    const seenIds = new Set<string>();

    const { data: progress } = await supabaseAdmin
  .from("search_progress")
  .select("next_offset")
  .eq("city", city)
  .eq("business_type", businessType || "Restaurant")
  .maybeSingle();

let offset = progress?.next_offset ?? 0;

    const batchSize = limit;

    while (newLeads.length < limit) {
      const remaining = limit - newLeads.length;
        
      const { leads, nextOffset } = await searchLeads({
        city,
        businessType: businessType || "Restaurant",
        limit: batchSize,
        offset,
      });
         
      if (leads.length === 0) {
        break;
      }

      // Prevent duplicates within this search session.
      const uniqueLeads = leads.filter((lead) => {
        if (seenIds.has(lead.id)) {
          return false;
        }

        seenIds.add(lead.id);
        return true;
      });

      const sourceIds = uniqueLeads.map((lead) => lead.id);

      // Check which of these restaurants are already in Supabase.
      const { data: existingRestaurants, error: lookupError } = await supabaseAdmin
        .from("restaurants")
        .select("source_id")
        .in("source_id", sourceIds);

      if (lookupError) {
        throw lookupError;
      }

      const existingIds = new Set(
        (existingRestaurants ?? []).map((restaurant) => restaurant.source_id),
      );

      const freshLeads = uniqueLeads
        .filter((lead) => !existingIds.has(lead.id))
        .slice(0, remaining);

      newLeads.push(...freshLeads);

if (freshLeads.length > 0) {
  const restaurants = freshLeads.map((lead) => ({
    source_id: lead.id,
    name: lead.businessName,
    address: lead.location,
    website: lead.website,
    email: lead.email,
    city,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("restaurants")
    .upsert(restaurants, {
      onConflict: "source_id",
      ignoreDuplicates: true,
    });

  if (insertError) {
    throw insertError;
  }
}

if (nextOffset !== null) {
  const { error: progressError } = await supabaseAdmin
    .from("search_progress")
    .upsert(
      {
        city,
        business_type: businessType || "Restaurant",
        next_offset: nextOffset,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "city,business_type",
      },
    );

  if (progressError) {
    throw progressError;
  }
}

// Move to the next Open Places page.
if (nextOffset === null) {
  break;
}

offset = nextOffset;
    }

    return newLeads;
}